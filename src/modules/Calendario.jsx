import { useState, useMemo, useEffect } from "react";
import { store } from "../core/store.js";

/* ─── Theme ─── */
const T = {
  bg:"#F0EEE9", surface:"#fff", surfaceAlt:"#F7F5F2",
  border:"#E4E1DB", ink:"#1A1A1A", inkMid:"#6B6560", inkLight:"#9B9590",
  accent:"#111", accentBg:"rgba(0,0,0,.04)",
  green:"#16a34a", greenBg:"#f0fdf4",
  blue:"#2563eb", blueBg:"#eff6ff",
  amber:"#d97706", amberBg:"#fffbeb",
  red:"#dc2626", redBg:"#fef2f2",
  shadow:"0 1px 3px rgba(0,0,0,.06)",
};
const F = { fontFamily:"'DM Sans',sans-serif" };
const uid = () => Math.random().toString(36).slice(2,10);
const today = () => new Date().toISOString().slice(0,10);

const KEYS = { config:"hab:calendario:config", citas:"hab:calendario:citas" };
const load = k => { try { return JSON.parse(store.getSync(k)) || null } catch { return null }};
const save = (k,v) => store.set(k, JSON.stringify(v));

const DIAS_SEMANA = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
const DIAS_LABELS = { lunes:"Lunes", martes:"Martes", miercoles:"Miércoles", jueves:"Jueves", viernes:"Viernes", sabado:"Sábado", domingo:"Domingo" };
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const DEF_DISP = {
  lunes:{activo:true,inicio:"09:00",fin:"18:00"}, martes:{activo:true,inicio:"09:00",fin:"18:00"},
  miercoles:{activo:true,inicio:"09:00",fin:"18:00"}, jueves:{activo:true,inicio:"09:00",fin:"18:00"},
  viernes:{activo:true,inicio:"09:00",fin:"18:00"}, sabado:{activo:false,inicio:"09:00",fin:"13:00"},
  domingo:{activo:false,inicio:"",fin:""},
};

const DEF_CONFIG = {
  servicios: [
    { id:"s1", nombre:"Consultoría inicial", duracion:20, descripcion:"Primera toma de contacto para conocer tu proyecto", precio:0, tipo:"virtual", color:"#111111", activo:true },
    { id:"s2", nombre:"Diseño de interiores", duracion:20, descripcion:"Concepto creativo, moodboard, mobiliario, iluminación y acabados", precio:0, tipo:"virtual", color:"#2563eb", activo:true },
    { id:"s3", nombre:"Arquitectura", duracion:20, descripcion:"Reforma, redistribución, planos técnicos y modelado 3D", precio:0, tipo:"virtual", color:"#16a34a", activo:true },
    { id:"s4", nombre:"Obra integral", duracion:20, descripcion:"Gestión y ejecución completa de tu proyecto", precio:0, tipo:"presencial", color:"#d97706", activo:true },
    { id:"s5", nombre:"Obra parcial", duracion:20, descripcion:"Ejecución de partidas específicas según presupuesto", precio:0, tipo:"presencial", color:"#9333ea", activo:true },
    { id:"s6", nombre:"Visita técnica", duracion:20, descripcion:"Inspección en sitio, mediciones y diagnóstico", precio:0, tipo:"presencial", color:"#059669", activo:true },
  ],
  slotsPublicos: [],
  disponibilidad: {...DEF_DISP},
  bufferMinutos:15, anticipacionMaxDias:60,
  mensajeBienvenida:"Agenda tu cita con nuestro equipo de Habitaris.",
  formularioIntake:true, crearJitsi:true, notificarEmail:true, notificarWhatsApp:false,
  modulos: ["CRM","Proyectos","RRHH","Legal","Postventa"],
};

function getBrand() {
  try {
    const cfg = JSON.parse(store.getSync("habitaris_config")) || {};
    return {
      nombre: cfg.empresa?.nombre || "Habitaris",
      logoBlanco: cfg.apariencia?.logoBlanco || "/logo-habitaris-blanco.png",
      logoNegro: cfg.apariencia?.logoNegro || "/logo-habitaris-negro.svg",
      colorPrimario: cfg.apariencia?.colorPrimario || "#111111",
      tipografia: cfg.apariencia?.tipografia || "DM Sans",
      slogan: cfg.apariencia?.slogan || "Arquitectura · Interiorismo",
      telefono: cfg.empresa?.telefono || "+57 350 566 1545",
      email: cfg.empresa?.email || "info@habitaris.co",
      web: cfg.empresa?.web || "www.habitaris.co",
    };
  } catch { return { nombre:"Habitaris", colorPrimario:"#111", tipografia:"DM Sans", slogan:"Arquitectura · Interiorismo", logoBlanco:"/logo-habitaris-blanco.png" }; }
}

function generarSlots(disp, fecha, citas, slotsPublicos) {
  const dia = new Date(fecha+"T12:00:00");
  const ds = DIAS_SEMANA[dia.getDay()];
  const d = disp[ds];
  if (!d||!d.activo) return [];
  const [hI,mI]=d.inicio.split(":").map(Number);
  const [hF,mF]=d.fin.split(":").map(Number);
  const allSlots=[];
  let m=hI*60+mI;
  while(m+30<=hF*60+mF){
    const h=String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");
    allSlots.push(h);
    m+=30;
  }
  // Si hay slots públicos configurados para esta fecha, solo mostrar esos
  const pubSlots = slotsPublicos?.filter(s => s.fecha === fecha && s.activo);
  let disponibles = allSlots;
  if (pubSlots && pubSlots.length > 0) {
    disponibles = pubSlots.map(s => s.hora).filter(h => allSlots.includes(h));
  }
  // Quitar ocupados
  return disponibles.filter(h => !citas.some(c => c.fecha===fecha && c.hora===h && c.estado!=="cancelada" && c.estado!=="rechazada"));
}

function formatFecha(f) {
  if(!f) return "";
  return new Date(f+"T12:00:00").toLocaleDateString("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}

function generarICS(cita, brand) {
  const hh=parseInt(cita.hora.split(":")[0]), mm=parseInt(cita.hora.split(":")[1]);
  const dur=cita.duracionMin||60;
  const eMin=hh*60+mm+dur;
  const s=cita.fecha.replace(/-/g,"")+"T"+String(hh).padStart(2,"0")+String(mm).padStart(2,"0")+"00";
  const e=cita.fecha.replace(/-/g,"")+"T"+String(Math.floor(eMin/60)).padStart(2,"0")+String(eMin%60).padStart(2,"0")+"00";
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Habitaris//Calendario//ES","BEGIN:VEVENT",
    "DTSTART:"+s,"DTEND:"+e,
    "SUMMARY:"+(cita.servicioNombre||cita.asunto||"Reunión")+" - "+brand.nombre,
    "DESCRIPTION:"+(cita.jitsiLink?"Videollamada: "+cita.jitsiLink:"Reunión "+brand.nombre),
    "LOCATION:"+(cita.jitsiLink||"Por confirmar"),
    "STATUS:CONFIRMED","END:VEVENT","END:VCALENDAR"].join("\r\n");
}

function descargarICS(cita, brand) {
  const blob = new Blob([generarICS(cita, brand)], {type:"text/calendar"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="cita-"+cita.fecha+".ics"; a.click();
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════
   PÚBLICO — Página de reserva (solo servicios, sin profesional)
   Citas quedan PENDIENTES hasta que la empresa apruebe
   ═══════════════════════════════════════════════════ */
export function CalendarioPublico() {
  const brand = useMemo(getBrand,[]);
  const bf = brand.tipografia;
  const cs = {fontFamily:"'"+bf+"',sans-serif"};
  const [config] = useState(()=>load(KEYS.config)||DEF_CONFIG);
  const [citas, setCitas] = useState(()=>load(KEYS.citas)||[]);
  const [paso, setPaso] = useState(1);
  const [selServicio, setSelServicio] = useState(null);
  const [selFecha, setSelFecha] = useState("");
  const [selHora, setSelHora] = useState("");
  const [form, setForm] = useState({nombre:"",email:"",telefono:"",tipoProyecto:"",presupuesto:"",direccion:"",notas:""});
  const [enviado, setEnviado] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const calDays = useMemo(()=>{
    const first=(new Date(calYear,calMonth,1).getDay()+6)%7;
    const n=new Date(calYear,calMonth+1,0).getDate();
    return [...Array(first).fill(null),...Array.from({length:n},(_,i)=>i+1)];
  },[calYear,calMonth]);

  const slots = useMemo(()=>{
    if(!selFecha) return [];
    return generarSlots(config.disponibilidad, selFecha, citas, config.slotsPublicos);
  },[selFecha,config,citas]);

  const isDayAvailable = d => {
    if(!d) return false;
    const fecha=calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    if(fecha<=today()) return false;
    const max=new Date(); max.setDate(max.getDate()+config.anticipacionMaxDias);
    if(new Date(fecha)>max) return false;
    const ds=DIAS_SEMANA[new Date(fecha+"T12:00:00").getDay()];
    // Si hay slots públicos, solo mostrar días que tengan slots configurados
    if(config.slotsPublicos?.length > 0) {
      return config.slotsPublicos.some(s => s.fecha === fecha && s.activo);
    }
    return config.disponibilidad[ds]?.activo||false;
  };

  const enviar = () => {
    const servicio = config.servicios.find(s=>s.id===selServicio);
    const nueva = {
      id:uid(), tipo:"publica", fecha:selFecha, hora:selHora,
      servicioId:selServicio, servicioNombre:servicio?.nombre, duracionMin:servicio?.duracion||60,
      cliente:{...form}, estado:"pendiente", jitsiLink:null,
      createdAt:new Date().toISOString(),
    };
    const next=[...citas,nueva];
    setCitas(next); save(KEYS.citas,next);
    setEnviado(true);
  };

  const inp = {width:"100%",padding:"10px 12px",borderRadius:6,border:"1px solid "+T.border,fontSize:13,marginTop:4,boxSizing:"border-box",...cs};
  const btnBack = {...cs,flex:1,padding:"10px",borderRadius:8,border:"1px solid "+T.border,background:T.surface,color:T.ink,cursor:"pointer",fontSize:12};
  const btnNext = (ok) => ({...cs,flex:1,padding:"10px",borderRadius:8,border:"none",background:ok?brand.colorPrimario:T.border,color:"#fff",cursor:ok?"pointer":"default",fontSize:12,fontWeight:600});

  if(enviado){
    return (
      <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",...cs}}>
        <div style={{background:T.surface,borderRadius:16,padding:40,maxWidth:480,width:"90%",textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.08)"}}>
          <div style={{fontSize:48,marginBottom:16}}>📩</div>
          <h2 style={{fontSize:22,fontWeight:700,color:T.ink,marginBottom:8}}>¡Solicitud enviada!</h2>
          <p style={{fontSize:13,color:T.inkMid,marginBottom:4,lineHeight:1.6}}>
            Tu solicitud de cita ha sido recibida. Nuestro equipo la revisará y te confirmaremos por email la fecha y hora definitiva.
          </p>
          <div style={{background:T.amberBg,borderRadius:8,padding:12,marginTop:16}}>
            <div style={{fontSize:11,fontWeight:600,color:T.amber}}>⏳ Pendiente de aprobación</div>
            <div style={{fontSize:12,color:T.inkMid,marginTop:4}}>
              {config.servicios.find(s=>s.id===selServicio)?.nombre} · {formatFecha(selFecha)} · {selHora}
            </div>
          </div>
          <div style={{fontSize:10,color:T.inkLight,marginTop:24}}>{brand.nombre} · {brand.slogan}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight:"100vh",background:T.bg,...cs}}>
      <div style={{background:brand.colorPrimario,padding:"16px 24px",display:"flex",alignItems:"center",gap:12}}>
        <img src={brand.logoBlanco} alt="" style={{height:28,objectFit:"contain"}} />
        <span style={{fontSize:8,letterSpacing:1.5,color:"rgba(255,255,255,.4)",textTransform:"uppercase"}}>{brand.slogan}</span>
      </div>
      <div style={{maxWidth:600,margin:"0 auto",padding:"32px 20px"}}>
        <h1 style={{fontSize:22,fontWeight:700,color:T.ink,marginBottom:4}}>Agendar cita</h1>
        <p style={{fontSize:13,color:T.inkMid,marginBottom:24,lineHeight:1.5}}>{config.mensajeBienvenida}</p>
        <div style={{display:"flex",gap:4,marginBottom:28}}>
          {[1,2,3,4].map(p=>(
            <div key={p} style={{flex:1,height:3,borderRadius:2,background:p<paso?brand.colorPrimario:p===paso?"rgba(0,0,0,.3)":T.border}} />
          ))}
        </div>

        {/* Paso 1: Servicio */}
        {paso===1 && (
          <div>
            <h3 style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:12}}>1. Selecciona el servicio</h3>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {config.servicios.filter(s=>s.activo!==false).map(s=>(
                <button key={s.id} onClick={()=>{setSelServicio(s.id);setPaso(2);}}
                  style={{...cs,background:T.surface,border:"1px solid "+T.border,borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:T.ink}}>{s.nombre}</div>
                      <div style={{fontSize:11,color:T.inkMid,marginTop:2}}>{s.descripcion}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.ink}}>{s.duracion} min</div>
                      {s.precio>0&&<div style={{fontSize:10,color:T.inkMid}}>{s.precio.toLocaleString("es-CO")} COP</div>}
                      <div style={{fontSize:9,color:T.inkLight,marginTop:2}}>{s.tipo==="virtual"?"💻 Virtual":"📍 Presencial"}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Paso 2: Fecha y hora */}
        {paso===2 && (
          <div>
            <h3 style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:12}}>2. Fecha y hora preferida</h3>
            <p style={{fontSize:11,color:T.inkMid,marginBottom:12}}>Selecciona tu preferencia. Nuestro equipo confirmará la disponibilidad.</p>
            <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:16,marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <button onClick={()=>{let m=calMonth-1,y=calYear;if(m<0){m=11;y--;}setCalMonth(m);setCalYear(y);}}
                  style={{...cs,background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.inkMid}}>‹</button>
                <span style={{fontSize:13,fontWeight:600,color:T.ink}}>{MESES[calMonth]} {calYear}</span>
                <button onClick={()=>{let m=calMonth+1,y=calYear;if(m>11){m=0;y++;}setCalMonth(m);setCalYear(y);}}
                  style={{...cs,background:"none",border:"none",cursor:"pointer",fontSize:16,color:T.inkMid}}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center",fontSize:10,fontWeight:600,color:T.inkLight,marginBottom:4}}>
                {["Lu","Ma","Mi","Ju","Vi","Sa","Do"].map(d=><div key={d}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {calDays.map((d,i)=>{
                  if(!d) return <div key={i}/>;
                  const fecha=calYear+"-"+String(calMonth+1).padStart(2,"0")+"-"+String(d).padStart(2,"0");
                  const avail=isDayAvailable(d);
                  const sel=fecha===selFecha;
                  return <button key={i} disabled={!avail} onClick={()=>{setSelFecha(fecha);setSelHora("");}}
                    style={{...cs,width:"100%",aspectRatio:"1",borderRadius:6,border:"none",
                      background:sel?brand.colorPrimario:"transparent",color:sel?"#fff":avail?T.ink:T.border,
                      fontWeight:sel?700:400,fontSize:12,cursor:avail?"pointer":"default"}}>{d}</button>;
                })}
              </div>
            </div>
            {selFecha&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:T.inkMid,marginBottom:8}}>{formatFecha(selFecha)}</div>
                {slots.length===0?<div style={{fontSize:12,color:T.inkLight,padding:12}}>Sin horarios disponibles este día</div>:(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                    {slots.map(h=><button key={h} onClick={()=>setSelHora(h)}
                      style={{...cs,padding:"8px 4px",borderRadius:6,fontSize:12,fontWeight:500,cursor:"pointer",
                        background:selHora===h?brand.colorPrimario:T.surface,color:selHora===h?"#fff":T.ink,
                        border:"1px solid "+(selHora===h?brand.colorPrimario:T.border)}}>{h}</button>)}
                  </div>
                )}
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={()=>setPaso(1)} style={btnBack}>← Atrás</button>
              <button onClick={()=>setPaso(3)} disabled={!selHora} style={btnNext(!!selHora)}>Continuar →</button>
            </div>
          </div>
        )}

        {/* Paso 3: Datos */}
        {paso===3 && (
          <div>
            <h3 style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:12}}>3. Tus datos</h3>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[["nombre","Nombre completo *"],["email","Email *"],["telefono","Teléfono / WhatsApp *"]].map(([k,l])=>(
                <div key={k}>
                  <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase",letterSpacing:.5}}>{l}</label>
                  <input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} style={{...inp}} />
                </div>
              ))}
              {config.formularioIntake&&<>
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Dirección del inmueble (opcional)</label>
                  <input value={form.direccion||""} onChange={e=>setForm(p=>({...p,direccion:e.target.value}))} style={{...inp}} placeholder="Ciudad, barrio, dirección..." />
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Cuéntanos brevemente sobre tu proyecto</label>
                  <textarea value={form.notas||""} onChange={e=>setForm(p=>({...p,notas:e.target.value}))} rows={3} style={{...inp,resize:"vertical"}} placeholder="Descripción breve de lo que necesitas..." />
                </div>
              </>}
            </div>
            <div style={{display:"flex",gap:8,marginTop:20}}>
              <button onClick={()=>setPaso(2)} style={btnBack}>← Atrás</button>
              <button onClick={()=>setPaso(4)} disabled={!form.nombre||!form.email||!form.telefono}
                style={btnNext(form.nombre&&form.email&&form.telefono)}>Revisar →</button>
            </div>
          </div>
        )}

        {/* Paso 4: Confirmación */}
        {paso===4 && (()=>{
          const servicio=config.servicios.find(s=>s.id===selServicio);
          return (
            <div>
              <h3 style={{fontSize:14,fontWeight:600,color:T.ink,marginBottom:16}}>4. Confirmar solicitud</h3>
              <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:20,marginBottom:16}}>
                <div style={{display:"grid",gridTemplateColumns:"auto 1fr",gap:"8px 16px",fontSize:13}}>
                  <span style={{fontWeight:600,color:T.inkMid}}>Servicio:</span><span>{servicio?.nombre}</span>
                  <span style={{fontWeight:600,color:T.inkMid}}>Tipo:</span><span>{servicio?.tipo==="virtual"?"💻 Virtual":"📍 Presencial"}</span>
                  <span style={{fontWeight:600,color:T.inkMid}}>Fecha:</span><span>{formatFecha(selFecha)}</span>
                  <span style={{fontWeight:600,color:T.inkMid}}>Hora:</span><span>{selHora} ({servicio?.duracion} min)</span>
                  {servicio?.precio>0&&<><span style={{fontWeight:600,color:T.inkMid}}>Precio:</span><span>{servicio.precio.toLocaleString("es-CO")} COP</span></>}
                  <span style={{fontWeight:600,color:T.inkMid}}>Nombre:</span><span>{form.nombre}</span>
                  <span style={{fontWeight:600,color:T.inkMid}}>Email:</span><span>{form.email}</span>
                  <span style={{fontWeight:600,color:T.inkMid}}>Teléfono:</span><span>{form.telefono}</span>
                  {form.direccion&&<><span style={{fontWeight:600,color:T.inkMid}}>Dirección:</span><span>{form.direccion}</span></>}
                </div>
              </div>
              <div style={{background:T.amberBg,borderRadius:8,padding:12,marginBottom:16}}>
                <div style={{fontSize:11,color:T.amber,lineHeight:1.5}}>
                  ⚠️ Tu solicitud será revisada por nuestro equipo. Recibirás confirmación por email cuando sea aprobada.
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setPaso(3)} style={btnBack}>← Atrás</button>
                <button onClick={enviar}
                  style={{...cs,flex:1,padding:"12px",borderRadius:8,border:"none",background:T.green,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>
                  📩 Enviar solicitud
                </button>
              </div>
            </div>
          );
        })()}
      </div>
      <div style={{textAlign:"center",padding:"24px 16px",fontSize:10,color:T.inkLight}}>
        {brand.nombre} · {brand.slogan} · {brand.web}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   ADMIN — Panel de gestión completo
   ═══════════════════════════════════════════════════ */
export default function Calendario() {
  const brand = useMemo(getBrand,[]);
  const [tab, setTab] = useState("agenda");
  const [config, setConfig] = useState(()=>load(KEYS.config)||DEF_CONFIG);
  const [citas, setCitas] = useState(()=>load(KEYS.citas)||[]);
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todas");
  const [showNueva, setShowNueva] = useState(false);
  const [showReprogram, setShowReprogram] = useState(null);

  const proyectos = useMemo(()=>{
    try {
      const ofertas = JSON.parse(store.getSync("hab:crm:ofertas")) || [];
      return ofertas.filter(o=>o.estado!=="perdida").map(o=>({
        id:o.id, codigo:o.codigo||o.id, nombre:o.nombre||o.proyecto||"Sin nombre",
        cliente:o.contacto?.nombre||o.contacto?.email||"", estado:o.estado,
        miembros:o.miembros||[], clienteEmail:o.contacto?.email||"",
      }));
    } catch { return []; }
  },[]);

  // Load projects from CRM
  

  const saveConfig = n => { setConfig(n); save(KEYS.config,n); };
  const saveCitas = n => { setCitas(n); save(KEYS.citas,n); };

  const tabs = [
    {id:"agenda",icon:"📅",label:"Agenda"},
    {id:"solicitudes",icon:"📩",label:"Solicitudes"},
    {id:"nueva",icon:"➕",label:"Nueva reunión"},
    {id:"servicios",icon:"📋",label:"Servicios"},
    {id:"disponibilidad",icon:"🕐",label:"Disponibilidad"},
    {id:"config",icon:"⚙️",label:"Configuración"},
    {id:"compartir",icon:"🔗",label:"Compartir"},
  ];

  const citasFiltradas = useMemo(()=>{
    let list=[...citas].sort((a,b)=>(b.fecha+b.hora).localeCompare(a.fecha+a.hora));
    if(filtroEstado!=="todas") list=list.filter(c=>c.estado===filtroEstado);
    if(filtroTipo!=="todas") list=list.filter(c=>c.tipo===filtroTipo);
    return list;
  },[citas,filtroEstado,filtroTipo]);

  const pendientes = citas.filter(c=>c.estado==="pendiente").length;
  const citasHoy = citas.filter(c=>c.fecha===today()&&(c.estado==="aprobada"||c.estado==="confirmada")).length;
  const citasSemana = citas.filter(c=>{const d=(new Date(c.fecha+"T12:00:00")-new Date())/(864e5);return d>=0&&d<=7&&(c.estado==="aprobada"||c.estado==="confirmada");}).length;

  const cambiarEstado = (id, estado) => {
    const next = citas.map(c => {
      if (c.id!==id) return c;
      let upd = {...c, estado};
      // Si se aprueba una cita virtual, generar Jitsi
      if (estado==="aprobada" && c.tipo==="publica" && config.crearJitsi) {
        const serv = config.servicios.find(s=>s.id===c.servicioId);
        if (serv?.tipo==="virtual" && !c.jitsiLink) {
          upd.jitsiLink = "https://meet.jit.si/habitaris-"+uid();
        }
      }
      return upd;
    });
    saveCitas(next);
  };

  const reprogramar = (id, nuevaFecha, nuevaHora) => {
    saveCitas(citas.map(c=>c.id===id?{...c, fecha:nuevaFecha, hora:nuevaHora, estado:"reprogramada", reprogramadaEn:new Date().toISOString()}:c));
    setShowReprogram(null);
  };

  /* ─── Nueva reunión interna ─── */
  const [nuevaReunion, setNuevaReunion] = useState({
    asunto:"", modulo:"CRM", fecha:today(), hora:"10:00", duracionMin:60,
    tipo:"interna", participantes:"", clienteEmail:"", proyectoId:"", notas:"",
    conJitsi:true, conExterno:false, emailExterno:"",
  });

  const crearReunion = () => {
    const jitsi = nuevaReunion.conJitsi ? "https://meet.jit.si/habitaris-"+uid() : null;
    const nueva = {
      id:uid(), tipo:"interna", fecha:nuevaReunion.fecha, hora:nuevaReunion.hora,
      duracionMin:nuevaReunion.duracionMin, asunto:nuevaReunion.asunto,
      modulo:nuevaReunion.modulo, participantes:nuevaReunion.participantes,
      clienteEmail:nuevaReunion.clienteEmail, proyectoId:nuevaReunion.proyectoId,
      emailExterno:nuevaReunion.conExterno?nuevaReunion.emailExterno:"",
      jitsiLink:jitsi, estado:"confirmada", notas:nuevaReunion.notas,
      createdAt:new Date().toISOString(),
    };
    saveCitas([...citas, nueva]);
    setNuevaReunion({asunto:"",modulo:"CRM",fecha:today(),hora:"10:00",duracionMin:60,tipo:"interna",participantes:"",clienteEmail:"",proyectoId:"",notas:"",conJitsi:true,conExterno:false,emailExterno:""});
    setTab("agenda");
  };

  /* ─── RENDER: Solicitudes públicas (pendientes) ─── */
  const renderSolicitudes = () => {
    const pend = citas.filter(c=>c.tipo==="publica"&&(c.estado==="pendiente"||c.estado==="reprogramada")).sort((a,b)=>(a.fecha+a.hora).localeCompare(b.fecha+b.hora));
    return (
      <div>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>📩 Solicitudes de citas ({pend.length})</h3>
        {pend.length===0?(
          <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:40,textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:8}}>✅</div>
            <div style={{fontSize:13,color:T.inkLight}}>No hay solicitudes pendientes</div>
          </div>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pend.map(c=>{
              const serv = config.servicios.find(s=>s.id===c.servicioId);
              return (
                <div key={c.id} style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600,color:T.ink}}>{c.cliente?.nombre}</div>
                      <div style={{fontSize:11,color:T.inkMid}}>{c.cliente?.email} · {c.cliente?.telefono}</div>
                    </div>
                    <span style={{...F,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,
                      background:c.estado==="pendiente"?T.amberBg:T.blueBg,
                      color:c.estado==="pendiente"?T.amber:T.blue}}>
                      {c.estado==="pendiente"?"⏳ Pendiente":"🔄 Reprogramada"}
                    </span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:12,marginBottom:12}}>
                    <div><span style={{color:T.inkLight,fontSize:10}}>Servicio</span><br/><span style={{fontWeight:600}}>{serv?.nombre||"—"}</span></div>
                    <div><span style={{color:T.inkLight,fontSize:10}}>Fecha preferida</span><br/><span style={{fontWeight:600}}>{c.fecha} {c.hora}</span></div>
                    <div><span style={{color:T.inkLight,fontSize:10}}>Tipo</span><br/><span>{serv?.tipo==="virtual"?"💻 Virtual":"📍 Presencial"}</span></div>
                  </div>
                  {(c.cliente?.tipoProyecto||c.cliente?.presupuesto||c.cliente?.direccion)&&(
                    <div style={{background:T.surfaceAlt,borderRadius:6,padding:10,fontSize:11,color:T.inkMid,marginBottom:12}}>
                      {c.cliente.tipoProyecto&&<span>Proyecto: {c.cliente.tipoProyecto} · </span>}
                      {c.cliente.presupuesto&&<span>Presupuesto: {c.cliente.presupuesto} · </span>}
                      {c.cliente.direccion&&<span>Dir: {c.cliente.direccion}</span>}
                    </div>
                  )}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>cambiarEstado(c.id,"aprobada")}
                      style={{...F,padding:"8px 16px",borderRadius:6,background:T.green,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>
                      ✓ Aprobar
                    </button>
                    <button onClick={()=>setShowReprogram(c)}
                      style={{...F,padding:"8px 16px",borderRadius:6,background:T.blue,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>
                      🔄 Reprogramar
                    </button>
                    <button onClick={()=>cambiarEstado(c.id,"rechazada")}
                      style={{...F,padding:"8px 16px",borderRadius:6,background:T.redBg,color:T.red,border:"1px solid "+T.red+"33",cursor:"pointer",fontSize:11,fontWeight:600}}>
                      ✕ Rechazar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Modal reprogramar */}
        {showReprogram&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowReprogram(null)}>
            <div style={{background:T.surface,borderRadius:12,padding:28,width:400,maxWidth:"95vw"}} onClick={e=>e.stopPropagation()}>
              <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700}}>Reprogramar cita</h3>
              <p style={{fontSize:12,color:T.inkMid,marginBottom:12}}>Cliente: {showReprogram.cliente?.nombre}</p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:T.inkMid}}>NUEVA FECHA</label>
                  <input type="date" defaultValue={showReprogram.fecha} id="reprFecha"
                    style={{...F,width:"100%",padding:"8px",borderRadius:6,border:"1px solid "+T.border,fontSize:12,marginTop:4,boxSizing:"border-box"}} />
                </div>
                <div>
                  <label style={{fontSize:10,fontWeight:600,color:T.inkMid}}>NUEVA HORA</label>
                  <input type="time" defaultValue={showReprogram.hora} id="reprHora"
                    style={{...F,width:"100%",padding:"8px",borderRadius:6,border:"1px solid "+T.border,fontSize:12,marginTop:4,boxSizing:"border-box"}} />
                </div>
              </div>
              <div style={{display:"flex",gap:8,marginTop:20}}>
                <button onClick={()=>setShowReprogram(null)} style={{...F,flex:1,padding:"10px",borderRadius:6,border:"1px solid "+T.border,background:T.surface,cursor:"pointer",fontSize:12}}>Cancelar</button>
                <button onClick={()=>{
                  const f=document.getElementById("reprFecha").value;
                  const h=document.getElementById("reprHora").value;
                  if(f&&h) reprogramar(showReprogram.id,f,h);
                }} style={{...F,flex:1,padding:"10px",borderRadius:6,border:"none",background:T.blue,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── RENDER: Agenda general ─── */
  const renderAgenda = () => (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["⏳ Pendientes",pendientes,T.amber],["Hoy",citasHoy,T.blue],["Esta semana",citasSemana,T.green],["Total",citas.filter(c=>c.estado!=="cancelada"&&c.estado!=="rechazada").length,T.ink]]
          .map(([l,v,c],i)=>(
            <div key={i} style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:16}}>
              <div style={{fontSize:24,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:10,color:T.inkMid,fontWeight:600,marginTop:2}}>{l}</div>
            </div>
        ))}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[["todas","Todas"],["confirmada","Confirmadas"],["aprobada","Aprobadas"],["completada","Completadas"],["cancelada","Canceladas"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroEstado(v)}
            style={{...F,padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",
              background:filtroEstado===v?T.ink:T.surface,color:filtroEstado===v?"#fff":T.inkMid,border:"1px solid "+(filtroEstado===v?T.ink:T.border)}}>{l}</button>
        ))}
        <span style={{width:1,background:T.border,margin:"0 4px"}}/>
        {[["todas","Todas"],["publica","Públicas"],["interna","Internas"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltroTipo(v)}
            style={{...F,padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",
              background:filtroTipo===v?T.blue:T.surface,color:filtroTipo===v?"#fff":T.inkMid,border:"1px solid "+(filtroTipo===v?T.blue:T.border)}}>{l}</button>
        ))}
      </div>
      {citasFiltradas.length===0?(
        <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:40,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>📅</div>
          <div style={{fontSize:13,color:T.inkLight}}>Sin citas</div>
        </div>
      ):(
        <div style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:T.surfaceAlt}}>
              {["Fecha","Hora","Tipo","Asunto / Servicio","Cliente / Participantes","Estado",""].map((h,i)=>(
                <th key={i} style={{...F,padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:T.inkLight,borderBottom:"1px solid "+T.border}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {citasFiltradas.map(c=>{
                const estMap={pendiente:{bg:T.amberBg,color:T.amber,label:"⏳ Pendiente"},aprobada:{bg:T.greenBg,color:T.green,label:"✓ Aprobada"},
                  confirmada:{bg:T.greenBg,color:T.green,label:"✓ Confirmada"},completada:{bg:T.blueBg,color:T.blue,label:"● Completada"},
                  cancelada:{bg:T.redBg,color:T.red,label:"✕ Cancelada"},rechazada:{bg:T.redBg,color:T.red,label:"✕ Rechazada"},
                  reprogramada:{bg:T.blueBg,color:T.blue,label:"🔄 Reprogramada"}};
                const est=estMap[c.estado]||estMap.pendiente;
                return (
                  <tr key={c.id} style={{borderBottom:"1px solid "+T.border}}>
                    <td style={{...F,padding:"10px 12px",fontWeight:600}}>{c.fecha}</td>
                    <td style={{...F,padding:"10px 12px"}}>{c.hora}</td>
                    <td style={{...F,padding:"10px 12px"}}>
                      <span style={{fontSize:10,fontWeight:600,color:c.tipo==="publica"?T.amber:T.blue}}>{c.tipo==="publica"?"🌐 Pública":"🏢 Interna"}</span>
                    </td>
                    <td style={{...F,padding:"10px 12px",color:T.inkMid}}>{c.servicioNombre||c.asunto||"—"}</td>
                    <td style={{...F,padding:"10px 12px",fontWeight:600}}>{c.cliente?.nombre||c.participantes||"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{...F,fontSize:10,fontWeight:600,padding:"3px 8px",borderRadius:4,background:est.bg,color:est.color}}>{est.label}</span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        {(c.estado==="aprobada"||c.estado==="confirmada")&&<>
                          <button onClick={()=>cambiarEstado(c.id,"completada")} title="Completar" style={{...F,background:T.greenBg,border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:11}}>✓</button>
                          <button onClick={()=>cambiarEstado(c.id,"cancelada")} title="Cancelar" style={{...F,background:T.redBg,border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:11}}>✕</button>
                        </>}
                        {c.jitsiLink&&<a href={c.jitsiLink} target="_blank" rel="noreferrer" title="Videollamada" style={{...F,background:T.blueBg,border:"none",borderRadius:4,padding:"3px 6px",fontSize:11,textDecoration:"none"}}>📹</a>}
                        <button onClick={()=>descargarICS(c,brand)} title="Descargar .ics" style={{...F,background:T.amberBg,border:"none",borderRadius:4,padding:"3px 6px",cursor:"pointer",fontSize:11}}>📅</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  /* ─── RENDER: Nueva reunión interna ─── */
  const renderNueva = () => {
    const r = nuevaReunion;
    const upd = (k,v) => setNuevaReunion(p=>({...p,[k]:v}));
    const inp2 = {...F,width:"100%",padding:"8px 12px",borderRadius:6,border:"1px solid "+T.border,fontSize:12,marginTop:4,boxSizing:"border-box"};
    return (
      <div style={{maxWidth:600}}>
        <h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>➕ Nueva reunión interna</h3>
        <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Asunto *</label>
              <input value={r.asunto} onChange={e=>upd("asunto",e.target.value)} style={inp2} placeholder="Revisión de proyecto, kickoff, seguimiento..." />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Módulo</label>
                <select value={r.modulo} onChange={e=>upd("modulo",e.target.value)} style={{...inp2,background:T.surface}}>
                  {(config.modulos||["CRM","Proyectos","RRHH","Legal","Postventa"]).map(m=><option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Fecha</label>
                <input type="date" value={r.fecha} onChange={e=>upd("fecha",e.target.value)} style={inp2} />
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Hora</label>
                <input type="time" value={r.hora} onChange={e=>upd("hora",e.target.value)} style={inp2} />
              </div>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Duración (min)</label>
              <select value={r.duracionMin} onChange={e=>upd("duracionMin",+e.target.value)} style={{...inp2,background:T.surface,width:120}}>
                {[15,30,45,60,90,120].map(m=><option key={m} value={m}>{m} min</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Participantes internos (nombres separados por coma)</label>
              <input value={r.participantes} onChange={e=>upd("participantes",e.target.value)} style={inp2} placeholder="Laura, Ana, Carlos..." />
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Email cliente del portal (opcional)</label>
              <input value={r.clienteEmail} onChange={e=>upd("clienteEmail",e.target.value)} style={inp2} placeholder="cliente@email.com" />
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Proyecto / OT (opcional)</label>
              <select value={r.proyectoId} onChange={e=>{
                upd("proyectoId",e.target.value);
                const pry=proyectos.find(p=>p.id===e.target.value);
                if(pry){ upd("clienteEmail",pry.clienteEmail); upd("participantes",pry.miembros?.join?.(", ")||""); }
              }} style={{...inp2,background:T.surface}}>
                <option value="">Sin proyecto</option>
                {proyectos.map(p=><option key={p.id} value={p.id}>{p.codigo} — {p.nombre} ({p.cliente})</option>)}
              </select>
              {r.proyectoId&&(()=>{
                const pry=proyectos.find(p=>p.id===r.proyectoId);
                return pry?(
                  <div style={{marginTop:6,background:T.blueBg,borderRadius:6,padding:8,fontSize:10,color:T.blue}}>
                    📁 {pry.codigo} · Cliente: {pry.cliente||"—"} · Estado: {pry.estado}
                    {pry.miembros?.length>0&&<span> · Miembros: {pry.miembros.join(", ")}</span>}
                  </div>
                ):null;
              })()}
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={r.conExterno} onChange={e=>upd("conExterno",e.target.checked)} />
              Invitar participante externo
            </label>
            {r.conExterno&&(
              <div>
                <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Email externo</label>
                <input value={r.emailExterno} onChange={e=>upd("emailExterno",e.target.value)} style={inp2} placeholder="externo@email.com" />
              </div>
            )}
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,cursor:"pointer"}}>
              <input type="checkbox" checked={r.conJitsi} onChange={e=>upd("conJitsi",e.target.checked)} />
              Crear videollamada Jitsi automáticamente
            </label>
            <div>
              <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Notas</label>
              <textarea value={r.notas} onChange={e=>upd("notas",e.target.value)} rows={2} style={{...inp2,resize:"vertical"}} />
            </div>
          </div>
          <button onClick={crearReunion} disabled={!r.asunto||!r.fecha||!r.hora}
            style={{...F,marginTop:20,width:"100%",padding:"12px",borderRadius:8,border:"none",
              background:r.asunto&&r.fecha&&r.hora?T.ink:T.border,color:"#fff",cursor:r.asunto?"pointer":"default",fontSize:13,fontWeight:700}}>
            📅 Crear reunión
          </button>
        </div>
      </div>
    );
  };

  /* ─── RENDER: Servicios ─── */
  const renderServicios = () => (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:0}}>Servicios públicos</h3>
        <button onClick={()=>saveConfig({...config,servicios:[...config.servicios,{id:uid(),nombre:"Nuevo servicio",duracion:60,descripcion:"",precio:0,tipo:"virtual",color:"#2563eb"}]})}
          style={{...F,padding:"6px 14px",fontSize:11,fontWeight:600,color:"#fff",background:T.ink,border:"none",borderRadius:6,cursor:"pointer"}}>+ Agregar</button>
      </div>
      {config.servicios.map((s,i)=>(
        <div key={s.id} style={{background:T.surface,borderRadius:10,border:"1px solid "+T.border,padding:16,marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:"32px 2fr 80px 100px 90px 40px",gap:8,alignItems:"center"}}>
            <input type="checkbox" checked={s.activo!==false} onChange={e=>{const n=[...config.servicios];n[i]={...s,activo:e.target.checked};saveConfig({...config,servicios:n});}}
              title={s.activo!==false?"Visible en web — click para ocultar":"Oculto — click para mostrar"} style={{width:16,height:16,cursor:"pointer"}} />
            <input value={s.nombre} onChange={e=>{const n=[...config.servicios];n[i]={...s,nombre:e.target.value};saveConfig({...config,servicios:n});}}
              style={{...F,padding:"8px",borderRadius:4,border:"1px solid "+T.border,fontSize:12}} placeholder="Nombre" />
            <input type="number" value={s.duracion} onChange={e=>{const n=[...config.servicios];n[i]={...s,duracion:+e.target.value};saveConfig({...config,servicios:n});}}
              style={{...F,padding:"8px",borderRadius:4,border:"1px solid "+T.border,fontSize:12}} placeholder="min" />
            <input type="number" value={s.precio} onChange={e=>{const n=[...config.servicios];n[i]={...s,precio:+e.target.value};saveConfig({...config,servicios:n});}}
              style={{...F,padding:"8px",borderRadius:4,border:"1px solid "+T.border,fontSize:12}} placeholder="COP" />
            <select value={s.tipo} onChange={e=>{const n=[...config.servicios];n[i]={...s,tipo:e.target.value};saveConfig({...config,servicios:n});}}
              style={{...F,padding:"8px",borderRadius:4,border:"1px solid "+T.border,fontSize:11,background:T.surface}}>
              <option value="virtual">💻 Virtual</option><option value="presencial">📍 Presencial</option>
            </select>
            <button onClick={()=>saveConfig({...config,servicios:config.servicios.filter(x=>x.id!==s.id)})}
              style={{...F,background:T.redBg,border:"none",borderRadius:4,padding:"6px",cursor:"pointer",fontSize:11,color:T.red}}>🗑</button>
          </div>
          <input value={s.descripcion||""} onChange={e=>{const n=[...config.servicios];n[i]={...s,descripcion:e.target.value};saveConfig({...config,servicios:n});}}
            style={{...F,width:"100%",padding:"6px 8px",borderRadius:4,border:"1px solid "+T.border,fontSize:11,marginTop:6,boxSizing:"border-box",color:T.inkMid}} placeholder="Descripción..." />
        </div>
      ))}
    </div>
  );

  /* ─── RENDER: Disponibilidad ─── */
  const renderDisponibilidad = () => (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 8px"}}>Horario base</h3>
        <p style={{fontSize:11,color:T.inkMid,marginBottom:16}}>Define el horario general de la empresa. Los clientes solo verán los slots que habilites abajo.</p>
        {Object.entries(config.disponibilidad).map(([dia,val])=>(
          <div key={dia} style={{display:"grid",gridTemplateColumns:"120px 40px 1fr 1fr",gap:8,marginBottom:8,alignItems:"center"}}>
            <span style={{fontSize:12,fontWeight:600,color:T.ink}}>{DIAS_LABELS[dia]}</span>
            <input type="checkbox" checked={val.activo} onChange={e=>saveConfig({...config,disponibilidad:{...config.disponibilidad,[dia]:{...val,activo:e.target.checked}}})} />
            <input type="time" value={val.inicio} disabled={!val.activo} onChange={e=>saveConfig({...config,disponibilidad:{...config.disponibilidad,[dia]:{...val,inicio:e.target.value}}})}
              style={{...F,padding:"6px",borderRadius:4,border:"1px solid "+T.border,fontSize:12,opacity:val.activo?1:.4}} />
            <input type="time" value={val.fin} disabled={!val.activo} onChange={e=>saveConfig({...config,disponibilidad:{...config.disponibilidad,[dia]:{...val,fin:e.target.value}}})}
              style={{...F,padding:"6px",borderRadius:4,border:"1px solid "+T.border,fontSize:12,opacity:val.activo?1:.4}} />
          </div>
        ))}
      </div>
      <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 8px"}}>📌 Slots públicos específicos</h3>
        <p style={{fontSize:11,color:T.inkMid,marginBottom:16}}>
          Si defines slots aquí, los clientes SOLO verán estos horarios y no el horario base completo. Ideal para controlar exactamente qué espacios abres.
        </p>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input type="date" id="slotFecha" style={{...F,padding:"6px 8px",borderRadius:4,border:"1px solid "+T.border,fontSize:12}} />
          <input type="time" id="slotHora" style={{...F,padding:"6px 8px",borderRadius:4,border:"1px solid "+T.border,fontSize:12}} />
          <button onClick={()=>{
            const f=document.getElementById("slotFecha").value;
            const h=document.getElementById("slotHora").value;
            if(f&&h) saveConfig({...config,slotsPublicos:[...(config.slotsPublicos||[]),{id:uid(),fecha:f,hora:h,activo:true}]});
          }} style={{...F,padding:"6px 14px",borderRadius:4,background:T.ink,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>+ Agregar</button>
        </div>
        {(config.slotsPublicos||[]).length>0 ? (
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {config.slotsPublicos.map(s=>(
              <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,background:s.activo?T.greenBg:T.surfaceAlt,borderRadius:6,padding:"4px 10px",fontSize:11}}>
                <span style={{fontWeight:600}}>{s.fecha}</span>
                <span>{s.hora}</span>
                <button onClick={()=>saveConfig({...config,slotsPublicos:config.slotsPublicos.map(x=>x.id===s.id?{...x,activo:!x.activo}:x)})}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:11}}>{s.activo?"✅":"❌"}</button>
                <button onClick={()=>saveConfig({...config,slotsPublicos:config.slotsPublicos.filter(x=>x.id!==s.id)})}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:T.red}}>🗑</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{fontSize:11,color:T.inkLight}}>Sin slots específicos — se usa el horario base completo.</div>
        )}
      </div>
    </div>
  );

  /* ─── RENDER: Config ─── */
  const renderConfig = () => (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 16px"}}>Opciones generales</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {[["crearJitsi","Crear videollamada Jitsi al aprobar citas virtuales"],
            ["formularioIntake","Mostrar formulario de intake en página pública"],
            ["notificarEmail","Enviar notificación por email"],
            ["notificarWhatsApp","Enviar recordatorio por WhatsApp"]].map(([k,l])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:T.ink,cursor:"pointer"}}>
              <input type="checkbox" checked={config[k]||false} onChange={e=>saveConfig({...config,[k]:e.target.checked})} /> {l}
            </label>
          ))}
        </div>
        <div style={{marginTop:16}}>
          <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Mensaje de bienvenida (página pública)</label>
          <textarea value={config.mensajeBienvenida} onChange={e=>saveConfig({...config,mensajeBienvenida:e.target.value})} rows={2}
            style={{...F,width:"100%",padding:"8px 12px",borderRadius:6,border:"1px solid "+T.border,fontSize:12,marginTop:4,boxSizing:"border-box",resize:"vertical"}} />
        </div>
        <div style={{marginTop:12}}>
          <label style={{fontSize:10,fontWeight:600,color:T.inkMid,textTransform:"uppercase"}}>Anticipación máxima (días)</label>
          <input type="number" value={config.anticipacionMaxDias} onChange={e=>saveConfig({...config,anticipacionMaxDias:+e.target.value})}
            style={{...F,padding:"8px 12px",borderRadius:6,border:"1px solid "+T.border,fontSize:12,marginTop:4,width:100}} />
        </div>
      </div>
    </div>
  );

  /* ─── RENDER: Compartir ─── */
  const publicUrl = window.location.origin+"/agendar";
  const embedCode = '<iframe src="'+publicUrl+'" width="100%" height="700" style="border:none;border-radius:12px;" title="Agendar cita"></iframe>';

  const renderCompartir = () => (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 12px"}}>🔗 Enlace público</h3>
        <p style={{fontSize:12,color:T.inkMid,marginBottom:12}}>Comparte este enlace para que tus clientes soliciten citas.</p>
        <div style={{display:"flex",gap:8}}>
          <input value={publicUrl} readOnly style={{...F,flex:1,padding:"8px",borderRadius:4,border:"1px solid "+T.border,fontSize:11,background:T.surfaceAlt}} />
          <button onClick={()=>navigator.clipboard?.writeText(publicUrl)} style={{...F,padding:"6px 14px",borderRadius:4,background:T.ink,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>Copiar</button>
        </div>
      </div>
      <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 12px"}}>📱 QR</h3>
        <div style={{background:T.surfaceAlt,borderRadius:8,padding:20,textAlign:"center",display:"inline-block"}}>
          <img src={"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data="+encodeURIComponent(publicUrl)} alt="QR" style={{width:160,height:160}} />
          <div style={{fontSize:10,color:T.inkLight,marginTop:8}}>{publicUrl}</div>
        </div>
      </div>
      <div style={{background:T.surface,borderRadius:12,border:"1px solid "+T.border,padding:24}}>
        <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 12px"}}>🌐 WordPress</h3>
        <p style={{fontSize:12,color:T.inkMid,marginBottom:12}}>Copia y pega en un bloque HTML personalizado.</p>
        <textarea value={embedCode} readOnly rows={3}
          style={{...F,width:"100%",padding:"10px 12px",borderRadius:6,border:"1px solid "+T.border,fontSize:11,background:T.surfaceAlt,boxSizing:"border-box",fontFamily:"monospace"}} />
        <button onClick={()=>navigator.clipboard?.writeText(embedCode)}
          style={{...F,marginTop:8,padding:"8px 16px",borderRadius:6,background:T.ink,color:"#fff",border:"none",cursor:"pointer",fontSize:11,fontWeight:600}}>Copiar código</button>
      </div>
    </div>
  );

  return (
    <div style={{...F,maxWidth:1100,margin:"0 auto"}}>
      <h1 style={{fontSize:24,fontWeight:800,marginBottom:2}}>📅 Calendario</h1>
      <p style={{fontSize:12,color:T.inkMid,marginBottom:20}}>Gestiona citas públicas, reuniones internas y disponibilidad.</p>
      <div style={{display:"flex",gap:0,borderBottom:"2px solid "+T.border,marginBottom:24,overflowX:"auto"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{...F,padding:"10px 16px",fontSize:12,fontWeight:600,cursor:"pointer",background:"none",whiteSpace:"nowrap",
              border:"none",borderBottom:tab===t.id?"2px solid "+T.ink:"2px solid transparent",
              color:tab===t.id?T.ink:T.inkLight,marginBottom:-2}}>
            {t.icon} {t.label}
            {t.id==="solicitudes"&&pendientes>0&&<span style={{marginLeft:6,background:T.red,color:"#fff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:8}}>{pendientes}</span>}
          </button>
        ))}
      </div>
      {tab==="agenda"&&renderAgenda()}
      {tab==="solicitudes"&&renderSolicitudes()}
      {tab==="nueva"&&renderNueva()}
      {tab==="servicios"&&renderServicios()}
      {tab==="disponibilidad"&&renderDisponibilidad()}
      {tab==="config"&&renderConfig()}
      {tab==="compartir"&&renderCompartir()}
    </div>
  );
}
