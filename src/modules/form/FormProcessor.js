import { store } from "../../core/store.js";

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];
const now = () => new Date().toISOString();

function readStore(key) {
  try { const raw = store.getSync(key); if (raw) return JSON.parse(raw) || []; } catch {}
  return [];
}
function writeStore(key, data) { store.set(key, JSON.stringify(data)); }

export async function procesarRespuesta(r, forms, markProcesado) {
  const form = forms.find(f => f.id === r.formularioId);
  const modulo = form?.modulo || "general";
  switch (modulo) {
    case "crm": return procesarCRM(r, markProcesado);
    case "sst": return procesarSST(r, form, markProcesado);
    case "postventa": return procesarPostventa(r, form, markProcesado);
    case "logistica": return procesarLogistica(r, form, markProcesado);
    case "calidad": return procesarCalidad(r, form, markProcesado);
    case "rrhh": return procesarRRHH(r, form, markProcesado);
    default: return procesarGenerico(r, "hab:" + modulo + ":formularios", modulo, markProcesado);
  }
}

function procesarCRM(r, markProcesado) {
  let clientes = readStore("hab:crm:clientes2");
  const existing = clientes.find(c => c.email && c.email === r.clienteEmail);
  let clienteId;
  if (!existing) {
    const nc = { id:uid(), nombre:r.razonSocial||r.clienteNombre||"", tipo:r.razonSocial?"Empresa":"Persona natural", nit:r.documento||"", email:r.clienteEmail||"", telMovil:r.clienteTel||r.telefono||"", prefijoMovil:"+57", ciudad:r.ciudad||"", pais:"CO", notas:[r.edificio?("Proyecto: "+r.edificio):"",r.tipoProyecto?("Tipo: "+r.tipoProyecto):"",r.area?("Area: "+r.area+" m2"):"",r.presupuesto?("Presupuesto: "+r.presupuesto):""].filter(Boolean).join(" | "), emailFactura:r.emailFactura||r.clienteEmail||"", dirFacturacion:r.dirFacturacion||"", briefingId:r.id, fechaAlta:today() };
    clientes.push(nc); clienteId = nc.id; writeStore("hab:crm:clientes2", clientes);
  } else { clienteId = existing.id; }

  let ofertas = readStore("hab:v4");
  const nf = {
    id:uid()+Date.now().toString(36), nombre:[r.edificio,r.clienteNombre?.split(" ").slice(-1)[0]].filter(Boolean).join(" - ")||"Nuevo proyecto",
    cliente:r.clienteNombre||r.razonSocial||"", clienteId, email:r.clienteEmail||"", telefono:r.clienteTel||r.telefono||"",
    direccion:[r.ciudad,r.edificio].filter(Boolean).join(" - "), tipoProyecto:r.tipoProyecto||"", estado:"borrador", fechaOferta:today(),
    presupuestoCliente:r.presupuesto?Number(String(r.presupuesto).replace(/[^0-9]/g,"")):0, m2:r.area||"",
    notas:[r.servicios?.length?("Servicios: "+(Array.isArray(r.servicios)?r.servicios.join(", "):r.servicios)):"",r.estilo?.length?("Estilo: "+(Array.isArray(r.estilo)?r.estilo.join(", "):r.estilo)):"",r.espacios?.length?("Espacios: "+(Array.isArray(r.espacios)?r.espacios.join(", "):r.espacios)):"",r.colores?("Materiales: "+r.colores):"",r.expectativas?.length?("Expectativas: "+(Array.isArray(r.expectativas)?r.expectativas.join("; "):r.expectativas)):"",r.linksReferentes?("Referencias: "+r.linksReferentes):""].filter(Boolean).join("\n"),
    razonSocial:r.razonSocial||"", documento:r.documento||"", emailFactura:r.emailFactura||r.clienteEmail||"", dirFacturacion:r.dirFacturacion||"",
    retencion:r.retenciones==="Si", detalleRet:r.detalleRetenciones||"", anticipoAcept:r.anticipo||"", formaPago:r.formaPago||"",
    briefingId:r.id, lineas:[], capitulos:[], cronograma:[]
  };
  ofertas.push(nf); writeStore("hab:v4", ofertas);
  markProcesado(r.id, r._sbId);
  return { ok:true, msg:"Procesado a CRM\n\nCliente: "+(existing?"ya existia":"creado")+" - "+(r.clienteNombre||r.clienteEmail)+"\nOferta borrador creada\n\nVe a CRM para continuar." };
}

function procesarSST(r, form, markProcesado) {
  let inspecciones = readStore("hab:sst:inspecciones");
  const reg = { id:uid(), tipo:"inspeccion", proyecto:r["Proyecto/Obra"]||r.proyecto||r.clienteNombre||"", inspector:r["Inspector"]||r.inspector||r.clienteNombre||"", fecha:r["Fecha de inspeccion"]||r.fecha||today(), hallazgos:r["Hallazgos y observaciones"]||r.hallazgos||"", resultado:r["Resultado general"]||"Pendiente", formularioId:r.formularioId, respuestaId:r.id, creadoDesde:"formulario", createdAt:now(), respuestas:{} };
  if (form?.campos) form.campos.forEach(c => { const v = r[c.label]||r[c.id]||r[c.mapKey]; if(v) reg.respuestas[c.label]=v; });
  const nc = Object.values(reg.respuestas).filter(v => v==="No cumple").length;
  reg.severidad = nc>=3?"critica":nc>=1?"media":"baja";
  inspecciones.push(reg); writeStore("hab:sst:inspecciones", inspecciones);
  markProcesado(r.id, r._sbId);
  const alert = reg.resultado==="No aprobado"?"\nALERTA: Inspeccion NO aprobada":"";
  return { ok:true, msg:"Procesado a SST\n\nInspeccion registrada\nProyecto: "+reg.proyecto+"\nInspector: "+reg.inspector+"\nResultado: "+reg.resultado+alert+"\n\nVe a SST para ver detalles." };
}

function procesarPostventa(r, form, markProcesado) {
  let encuestas = readStore("hab:postventa:encuestas");
  const ratings = [];
  if (form?.campos) form.campos.filter(c=>c.tipo==="rating").forEach(c => { const v=r[c.label]||r[c.id]; if(v) ratings.push({label:c.label,valor:Number(v)}); });
  const prom = ratings.length>0?Math.round((ratings.reduce((s,x)=>s+x.valor,0)/ratings.length)*10)/10:0;
  const reg = { id:uid(), tipo:"encuesta", cliente:r.clienteNombre||r["Nombre"]||"", proyecto:r["Proyecto/Inmueble"]||"", fecha:r.fecha||today(), ratings, promedioRating:prom, recomendaria:r["Recomendarias nuestros servicios?"]||"", comentarios:r["Comentarios adicionales"]||"", formularioId:r.formularioId, respuestaId:r.id, creadoDesde:"formulario", createdAt:now() };
  encuestas.push(reg); writeStore("hab:postventa:encuestas", encuestas);
  if (prom>0 && prom<3) {
    let tickets = readStore("hab:postventa:tickets");
    tickets.push({ id:uid(), titulo:"Seguimiento: baja satisfaccion - "+reg.cliente, cliente:reg.cliente, proyecto:reg.proyecto, prioridad:prom<2?"urgente":"alta", estado:"abierto", tipo:"seguimiento", descripcion:"Rating: "+prom+"/5. "+reg.comentarios, createdAt:now(), creadoDesde:"formulario" });
    writeStore("hab:postventa:tickets", tickets);
  }
  markProcesado(r.id, r._sbId);
  const ticketMsg = prom>0&&prom<3?"\nTicket de seguimiento creado":"";
  return { ok:true, msg:"Procesado a Postventa\n\nEncuesta registrada\nCliente: "+reg.cliente+"\nRating: "+prom+"/5"+ticketMsg+"\n\nVe a Postventa para ver detalles." };
}

function procesarLogistica(r, form, markProcesado) {
  let recepciones = readStore("hab:logistica:recepciones");
  const reg = { id:uid(), tipo:"recepcion", ordenCompra:r["Orden de compra / Referencia"]||r.ordenCompra||"", proveedor:r["Proveedor"]||r.proveedor||"", fecha:r["Fecha recepcion"]||r.fecha||today(), recibidoPor:r["Recibido por"]||r.clienteNombre||"", materiales:r["Materiales recibidos"]||r.materiales||"", conforme:r["Estado del material conforme?"]||"Pendiente", observaciones:r["Observaciones"]||"", formularioId:r.formularioId, respuestaId:r.id, creadoDesde:"formulario", createdAt:now() };
  recepciones.push(reg); writeStore("hab:logistica:recepciones", recepciones);
  markProcesado(r.id, r._sbId);
  const alert = reg.conforme==="No conforme"?"\nALERTA: Material NO conforme":"";
  return { ok:true, msg:"Procesado a Logistica\n\nRecepcion registrada\nOC: "+reg.ordenCompra+"\nProveedor: "+reg.proveedor+"\nEstado: "+reg.conforme+alert };
}

function procesarCalidad(r, form, markProcesado) {
  const esAud = form?.nombre?.toLowerCase().includes("auditor");
  const key = esAud?"hab:calidad:auditorias":"hab:calidad:nc";
  let registros = readStore(key);
  const reg = { id:uid(), tipo:esAud?"auditoria":"nc", titulo:r.titulo||form?.nombre||"Registro calidad", proyecto:r.proyecto||r["Proyecto"]||"", responsable:r.responsable||r.clienteNombre||"", fecha:r.fecha||today(), descripcion:r.descripcion||r["Hallazgo"]||"", severidad:r.severidad||"menor", estado:"abierta", formularioId:r.formularioId, respuestaId:r.id, creadoDesde:"formulario", createdAt:now(), respuestas:{} };
  if (form?.campos) form.campos.forEach(c => { const v=r[c.label]||r[c.id]; if(v) reg.respuestas[c.label]=v; });
  registros.push(reg); writeStore(key, registros);
  markProcesado(r.id, r._sbId);
  return { ok:true, msg:"Procesado a Calidad\n\n"+(esAud?"Auditoria":"No conformidad")+" registrada\n"+reg.titulo+"\n\nVe a Calidad para ver detalles." };
}

function procesarRRHH(r, form, markProcesado) {
  let evals = readStore("hab:rrhh:evaluaciones");
  const reg = { id:uid(), tipo:"evaluacion", empleado:r.empleado||r["Empleado"]||r.clienteNombre||"", evaluador:r.evaluador||r["Evaluador"]||"", periodo:r.periodo||"", fecha:r.fecha||today(), formularioId:r.formularioId, respuestaId:r.id, creadoDesde:"formulario", createdAt:now(), respuestas:{} };
  if (form?.campos) form.campos.forEach(c => { const v=r[c.label]||r[c.id]; if(v) reg.respuestas[c.label]=v; });
  evals.push(reg); writeStore("hab:rrhh:evaluaciones", evals);
  markProcesado(r.id, r._sbId);
  return { ok:true, msg:"Procesado a RRHH\n\nEvaluacion registrada\nEmpleado: "+reg.empleado+"\n\nVe a RRHH para ver detalles." };
}

function procesarGenerico(r, storeKey, modLabel, markProcesado) {
  let registros = readStore(storeKey);
  registros.push({ id:uid(), tipo:"formulario", nombre:r.clienteNombre||r.formularioNombre||"Registro", fecha:r.fecha||today(), formularioId:r.formularioId, formularioNombre:r.formularioNombre||"", respuestaId:r.id, creadoDesde:"formulario", createdAt:now(), datos:{...r} });
  writeStore(storeKey, registros);
  markProcesado(r.id, r._sbId);
  return { ok:true, msg:"Procesado a "+modLabel+"\n\nRegistro guardado.\nVe a "+modLabel+" para ver detalles." };
}
