import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { store } from "../core/store.js";


/* ─────── palette ─────── */
const C = {
  ink:"#111", inkMid:"#444", inkLight:"#888",
  bg:"#F5F5F5", surface:"#FFFFFF", border:"#E0E0E0",
  accent:"#111111", accentBg:"#EBEBEB",
  info:"#3B3B3B", infoBg:"#F0F0F0",
  warning:"#8C6A00", warningBg:"#FFF8EE",
  danger:"#B91C1C", dangerBg:"#FDF0F0",
  shadow:"0 1px 4px rgba(0,0,0,.06)", shadowMd:"0 4px 16px rgba(0,0,0,.10)",
}
const F = { fontFamily:"'DM Sans',sans-serif" }
const SK = "hab:legal:"
const load = k => { try { return JSON.parse(store.getSync(SK+k)) || null } catch { return null }}
const save = (k, v) => { store.set(SK+k, JSON.stringify(v)); }
const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7)
const fmtDate = d => d ? new Date(d).toLocaleDateString("es-CO",{ day:"2-digit", month:"short", year:"numeric" }) : "—"

function Badge({ children, color, bg }) {
  return <span style={{ ...F, display:"inline-block", padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:600, color, background:bg }}>{children}</span>
}
function daysUntil(d) { return d ? Math.ceil((new Date(d)-new Date())/(1000*60*60*24)) : Infinity }

/* ═══════════════════════════════════════════════════
   PLANTILLAS DE DOCUMENTOS TIPO
   ═══════════════════════════════════════════════════ */
const CATEGORIAS_DOC = [
  { id:"contratos",      label:"Contratos",               icon:"📄", color:"#3B3B3B" },
  { id:"otrosies",       label:"Otrosíes / Modificaciones", icon:"📎", color:"#5B3A8C" },
  { id:"actas",          label:"Actas",                   icon:"📋", color:"#111111" },
  { id:"cartas",         label:"Cartas / Comunicaciones", icon:"✉️", color:"#8C6A00" },
  { id:"poderes",        label:"Poderes / Autorizaciones", icon:"🔏", color:"#0D5E6E" },
  { id:"formatos",       label:"Formatos Internos",       icon:"📝", color:"#555" },
]

const PLANTILLAS_SEED = [
  /* ── CONTRATOS ── */
  { id:"tpl_contrato_diseno", cat:"contratos", nombre:"Contrato de Diseño Interior",
    desc:"Contrato de prestación de servicios de diseño interior. Incluye alcance, fases, entregables, honorarios y forma de pago.",
    variables:["nombre_cliente","documento_cliente","direccion_inmueble","descripcion_alcance","valor_honorarios","forma_pago","plazo_dias","fecha"],
    contenido:`CONTRATO DE PRESTACIÓN DE SERVICIOS DE DISEÑO INTERIOR\n\nEntre {{empresa_nombre}}, con NIT {{empresa_nit}}, representada por {{rep_legal}}, en adelante EL CONTRATISTA, y {{nombre_cliente}}, identificado con {{documento_cliente}}, en adelante EL CLIENTE.\n\nOBJETO: El CONTRATISTA se compromete a prestar servicios profesionales de diseño interior para el inmueble ubicado en {{direccion_inmueble}}.\n\nALCANCE: {{descripcion_alcance}}\n\nVALOR Y FORMA DE PAGO: El valor total de los honorarios es de {{valor_honorarios}}, pagaderos así: {{forma_pago}}.\n\nPLAZO: {{plazo_dias}} días calendario a partir de la firma del presente contrato.\n\nOBLIGACIONES DEL CONTRATISTA:\n1. Elaborar propuesta de diseño según briefing aprobado\n2. Presentar renders y planos técnicos\n3. Entregar memoria descriptiva y presupuesto de obra\n4. Realizar seguimiento durante la ejecución (si aplica)\n\nOBLIGACIONES DEL CLIENTE:\n1. Suministrar información veraz del inmueble\n2. Realizar los pagos en los plazos acordados\n3. Aprobar o solicitar ajustes en los plazos establecidos\n\nSe firma en {{ciudad}} a los {{fecha}}.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_contrato_obra", cat:"contratos", nombre:"Contrato de Obra / Remodelación",
    desc:"Contrato de ejecución de obra de remodelación. Incluye presupuesto, cronograma, garantías y penalizaciones.",
    variables:["nombre_cliente","documento_cliente","direccion_inmueble","descripcion_obra","valor_obra","anticipo_pct","plazo_dias","fecha"],
    contenido:`CONTRATO DE OBRA PARA REMODELACIÓN\n\nEntre {{empresa_nombre}}, NIT {{empresa_nit}}, en adelante EL CONTRATISTA, y {{nombre_cliente}}, identificado con {{documento_cliente}}, en adelante EL PROPIETARIO.\n\nOBJETO: Ejecución de obras de remodelación en {{direccion_inmueble}} según diseño aprobado.\n\nDESCRIPCIÓN: {{descripcion_obra}}\n\nVALOR: {{valor_obra}} (IVA incluido). ANTICIPO: {{anticipo_pct}}% contra firma. El saldo se pagará según avance de obra certificado.\n\nPLAZO: {{plazo_dias}} días calendario.\n\nGARANTÍAS:\n- Estabilidad de obra: 5 años\n- Acabados: 1 año\n- Instalaciones: 2 años\n\nSe firma en {{ciudad}} a los {{fecha}}.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_contrato_laboral", cat:"contratos", nombre:"Contrato Individual de Trabajo — Término Fijo",
    desc:"Contrato laboral a término fijo con cláusulas normalizadas según Código Sustantivo del Trabajo colombiano. Formato PDF con tabla de datos, cláusulas y bloque de firmas.",
    variables:["nombre_trabajador","tipo_doc","numero_doc","direccion_trabajador","email_trabajador","celular_trabajador","cargo","salario_neto","salario_base","auxilio_transporte","bono_no_salarial","jornada_horas","horario","dias_laborales","tipo_contrato","duracion_meses","fecha_inicio","periodo_prueba","ciudad","descriptor_codigo","abogado_nombre"],
    contenido:`CONTRATO INDIVIDUAL DE TRABAJO\n\n[Tabla de datos del contrato con formato Habitaris]\n\nDATOS DEL CONTRATO\n- Código: HAB-CTR-{{año}}-{{consecutivo}}\n- Clase: Individual a término fijo\n- Duración: {{duracion_meses}} meses\n\nEMPLEADOR\n- HABITARIS SAS — NIT 901.922.136-8\n- Rep. Legal: Ana María Díaz Buitrago — CC 1.109.293.384\n\nTRABAJADOR(A)\n- {{nombre_trabajador}} — {{tipo_doc}} {{numero_doc}}\n- Dirección: {{direccion_trabajador}}\n- Email: {{email_trabajador}} — Cel: {{celular_trabajador}}\n\nCONDICIONES LABORALES\n- Cargo: {{cargo}}\n- Salario neto: {{salario_neto}}\n- Jornada: {{jornada_horas}} horas — {{dias_laborales}}\n- Horario: {{horario}}\n\nCLÁUSULAS\n\nPRIMERA.- EL EMPLEADOR contrata los servicios personales de EL TRABAJADOR para desempeñar el cargo de {{cargo}}.\n\nSEGUNDA.- Las partes declaran que en el presente contrato se entienden incorporadas las disposiciones del Código Sustantivo del Trabajo.\n\nTERCERA.- Funciones según descriptor de cargo {{descriptor_codigo}}.\n\nCUARTA.- Duración del contrato: {{duracion_meses}} meses a partir del {{fecha_inicio}}.\n\nQUINTA.- Jornada laboral: {{jornada_horas}} horas semanales en horario {{horario}}, días {{dias_laborales}}.\n\nSEXTA.- Remuneración: {{salario_neto}} neto mensual, pagadero quincenalmente.\n\nSÉPTIMA.- Afiliación a seguridad social (EPS, pensión, ARL) conforme a la ley.\n\nOCTAVA.- Lugar de trabajo: {{ciudad}}.\n\nNOVENA.- Período de prueba: {{periodo_prueba}}.\n\nDÉCIMA.- Vacaciones conforme al artículo 186 del CST.\n\n[Cláusulas adicionales estándar: obligaciones, terminación, descuentos, horas extra, modificaciones]\n\nFIRMANTES:\n- Revisado por: {{abogado_nombre}} — Asesor(a) Legal\n- Trabajador: {{nombre_trabajador}} — {{tipo_doc}} {{numero_doc}}\n- Empleador: Ana María Díaz Buitrago — CC 1.109.293.384 — Rep. Legal HABITARIS SAS`,
    pais:"CO", obligatorio:false },
  { id:"tpl_contrato_indefinido", cat:"contratos", nombre:"Contrato Individual de Trabajo — Término Indefinido",
    desc:"Contrato laboral a término indefinido. Mismo formato que el de término fijo pero sin fecha de terminación.",
    variables:["nombre_trabajador","tipo_doc","numero_doc","direccion_trabajador","email_trabajador","celular_trabajador","cargo","salario_neto","jornada_horas","horario","dias_laborales","fecha_inicio","periodo_prueba","ciudad","descriptor_codigo","abogado_nombre"],
    contenido:`CONTRATO INDIVIDUAL DE TRABAJO\n\nClase: Individual a término indefinido\nDemás condiciones y cláusulas iguales al contrato a término fijo, sin cláusula de duración definida.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_descriptor_cargo", cat:"contratos", nombre:"Descriptor de Cargo",
    desc:"Descriptor genérico de cargo con funciones, competencias, perfil y sistemas de gestión. Para biblioteca de cargos.",
    variables:["cargo","codigo_cargo","area","nivel","reporta_a","supervisa","interactua","objetivo","funciones_principales","funciones_calidad","funciones_sst","educacion","formacion","experiencia_general","experiencia_especifica","competencias_org","competencias_cargo"],
    contenido:`DESCRIPTOR DE CARGO\n\n[Formato Habitaris con secciones]\n\nI. IDENTIFICACIÓN DEL CARGO\n- Cargo: {{cargo}}\n- Código: {{codigo_cargo}}\n- Área: {{area}}\n- Nivel: {{nivel}}\n- Reporta a: {{reporta_a}}\n- Supervisa: {{supervisa}}\n\nII. OBJETIVO DEL CARGO\n{{objetivo}}\n\nIII. FUNCIONES PRINCIPALES\n{{funciones_principales}}\n\nIV. RESPONSABILIDADES EN SISTEMAS DE GESTIÓN\nCalidad: {{funciones_calidad}}\nSST: {{funciones_sst}}\n\nV. PERFIL DEL CARGO\n- Educación: {{educacion}}\n- Formación: {{formacion}}\n- Experiencia general: {{experiencia_general}}\n- Experiencia específica: {{experiencia_especifica}}\n- Competencias organizacionales: {{competencias_org}}\n- Competencias específicas: {{competencias_cargo}}\n\nNota: La empresa podrá considerar idóneo a cualquier candidato que demuestre capacidad suficiente.\n\nVI. ACEPTACIÓN\nFirma del trabajador.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_contrato_prest_serv", cat:"contratos", nombre:"Contrato de Prestación de Servicios",
    desc:"Para contratistas independientes, proveedores y consultores.",
    variables:["nombre_contratista","documento_contratista","objeto","valor","plazo","entregables"],
    contenido:`CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES\n\nCONTRATANTE: {{empresa_nombre}}\nCONTRATISTA: {{nombre_contratista}}, {{documento_contratista}}\n\nOBJETO: {{objeto}}\nVALOR: {{valor}}\nPLAZO: {{plazo}}\nENTREGABLES: {{entregables}}\n\nEl CONTRATISTA actúa como independiente, sin subordinación laboral. Es responsable de sus propias obligaciones tributarias y de seguridad social.`,
    pais:"CO", obligatorio:false },

  /* ── OTROSÍES ── */
  { id:"tpl_otrosi", cat:"otrosies", nombre:"Otrosí Modificatorio",
    desc:"Modificación de cláusulas de un contrato vigente.",
    variables:["numero_contrato","fecha_contrato","clausulas_modificadas","nuevo_texto"],
    contenido:`OTROSÍ MODIFICATORIO AL CONTRATO {{numero_contrato}}\n\nLas partes acuerdan modificar las siguientes cláusulas del contrato de fecha {{fecha_contrato}}:\n\nCLÁUSULAS MODIFICADAS: {{clausulas_modificadas}}\n\nNUEVO TEXTO: {{nuevo_texto}}\n\nLas demás cláusulas permanecen vigentes e inalteradas.`,
    pais:"CO", obligatorio:false },

  /* ── ACTAS ── */
  { id:"tpl_acta_inicio", cat:"actas", nombre:"Acta de Inicio de Obra",
    desc:"Acta de inicio de ejecución de obra con datos del proyecto, participantes y compromisos.",
    variables:["proyecto","direccion","contrato_ref","participantes","observaciones","fecha"],
    contenido:`ACTA DE INICIO DE OBRA\n\nPROYECTO: {{proyecto}}\nDIRECCIÓN: {{direccion}}\nCONTRATO REF: {{contrato_ref}}\nFECHA: {{fecha}}\n\nPARTICIPANTES:\n{{participantes}}\n\nSe da inicio formal a las obras de acuerdo con el contrato referenciado, el diseño aprobado y el cronograma pactado.\n\nOBSERVACIONES: {{observaciones}}\n\nSe firma por las partes como constancia.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_acta_vecindad", cat:"actas", nombre:"Acta de Vecindad",
    desc:"Registro del estado de inmuebles vecinos antes de iniciar obra.",
    variables:["proyecto","direccion_obra","inmuebles_vecinos","estado_actual","registro_fotografico","fecha"],
    contenido:`ACTA DE VECINDAD\n\nPROYECTO: {{proyecto}}\nDIRECCIÓN OBRA: {{direccion_obra}}\nFECHA: {{fecha}}\n\nINMUEBLES INSPECCIONADOS:\n{{inmuebles_vecinos}}\n\nESTADO ACTUAL REGISTRADO:\n{{estado_actual}}\n\nSe adjunta registro fotográfico de {{registro_fotografico}} fotografías como soporte.\n\nEsta acta tiene carácter probatorio del estado previo de los inmuebles vecinos.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_acta_entrega", cat:"actas", nombre:"Acta de Entrega / Recepción Final",
    desc:"Acta de recepción final de obra con checklist de verificación.",
    variables:["proyecto","cliente","items_verificados","observaciones","pendientes","garantias","fecha"],
    contenido:`ACTA DE ENTREGA Y RECEPCIÓN FINAL\n\nPROYECTO: {{proyecto}}\nCLIENTE: {{cliente}}\nFECHA: {{fecha}}\n\nSe procede a la entrega formal del proyecto con los siguientes ítems verificados:\n{{items_verificados}}\n\nOBSERVACIONES: {{observaciones}}\nPENDIENTES (si aplica): {{pendientes}}\n\nGARANTÍAS:\n{{garantias}}\n\nEl CLIENTE declara recibir a satisfacción.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_acta_comite", cat:"actas", nombre:"Acta de Comité de Obra",
    desc:"Registro de reuniones de seguimiento de obra.",
    variables:["numero","proyecto","asistentes","temas","compromisos","proxima_reunion","fecha"],
    contenido:`ACTA DE COMITÉ DE OBRA Nº {{numero}}\n\nPROYECTO: {{proyecto}}\nFECHA: {{fecha}}\nASISTENTES: {{asistentes}}\n\nTEMAS TRATADOS:\n{{temas}}\n\nCOMPROMISOS:\n{{compromisos}}\n\nPRÓXIMA REUNIÓN: {{proxima_reunion}}`,
    pais:"CO", obligatorio:false },

  /* ── CARTAS ── */
  { id:"tpl_carta_cobro", cat:"cartas", nombre:"Carta de Cobro / Recordatorio de Pago",
    desc:"Comunicación formal recordando saldos pendientes.",
    variables:["destinatario","concepto","valor_adeudado","fecha_vencimiento","plazo_respuesta","fecha"],
    contenido:`{{ciudad}}, {{fecha}}\n\nSeñor(a)\n{{destinatario}}\n\nRef: Recordatorio de pago — {{concepto}}\n\nCordial saludo.\n\nPermítanos recordarle que a la fecha se encuentra pendiente el pago de {{valor_adeudado}} correspondiente a {{concepto}}, con fecha de vencimiento {{fecha_vencimiento}}.\n\nAgradecemos realizar el pago en un plazo de {{plazo_respuesta}} días.\n\nAtentamente,\n{{empresa_nombre}}`,
    pais:"CO", obligatorio:false },
  { id:"tpl_carta_terminacion", cat:"cartas", nombre:"Carta de Terminación de Contrato",
    desc:"Comunicación formal de terminación de relación contractual.",
    variables:["destinatario","contrato_ref","motivo","fecha_efectiva","fecha"],
    contenido:`{{ciudad}}, {{fecha}}\n\nSeñor(a)\n{{destinatario}}\n\nRef: Terminación contrato {{contrato_ref}}\n\nPor medio de la presente le comunicamos la terminación del contrato referenciado por el siguiente motivo: {{motivo}}\n\nLa terminación será efectiva a partir del {{fecha_efectiva}}.\n\nQuedan vigentes las obligaciones pendientes y las garantías pactadas.\n\nAtentamente,\n{{empresa_nombre}}`,
    pais:"CO", obligatorio:false },
  { id:"tpl_carta_garantia", cat:"cartas", nombre:"Carta de Reclamación de Garantía",
    desc:"Comunicación de activación de garantía por defectos post-entrega.",
    variables:["destinatario","proyecto","items_garantia","plazo_respuesta","fecha"],
    contenido:`{{ciudad}}, {{fecha}}\n\nSeñor(a)\n{{destinatario}}\n\nRef: Reclamación de garantía — {{proyecto}}\n\nNos permitimos reportar los siguientes ítems que requieren atención bajo la garantía del proyecto:\n\n{{items_garantia}}\n\nSolicitamos atención en un plazo de {{plazo_respuesta}} días hábiles.\n\nAtentamente,\n{{empresa_nombre}}`,
    pais:"CO", obligatorio:false },

  /* ── PODERES ── */
  { id:"tpl_poder", cat:"poderes", nombre:"Poder Especial",
    desc:"Autorización para actuar en nombre de la empresa ante trámites específicos.",
    variables:["apoderado","documento_apoderado","facultades","vigencia","fecha"],
    contenido:`PODER ESPECIAL\n\n{{rep_legal}}, en calidad de representante legal de {{empresa_nombre}}, NIT {{empresa_nit}}, confiere poder especial a {{apoderado}}, identificado con {{documento_apoderado}}, para:\n\n{{facultades}}\n\nVIGENCIA: {{vigencia}}\n\nOtorgado en {{ciudad}} el {{fecha}}.`,
    pais:"CO", obligatorio:false },

  /* ── FORMATOS ── */
  { id:"tpl_paz_salvo", cat:"formatos", nombre:"Paz y Salvo",
    desc:"Certificación de cumplimiento de obligaciones contractuales.",
    variables:["beneficiario","contrato_ref","concepto","fecha"],
    contenido:`PAZ Y SALVO\n\n{{empresa_nombre}} certifica que {{beneficiario}} se encuentra a paz y salvo por concepto de {{concepto}} del contrato {{contrato_ref}}.\n\nSe expide en {{ciudad}} el {{fecha}}.`,
    pais:"CO", obligatorio:false },
  { id:"tpl_cert_laboral", cat:"formatos", nombre:"Certificación Laboral",
    desc:"Certificado de vinculación laboral con cargo y salario.",
    variables:["nombre_empleado","documento_empleado","cargo","fecha_ingreso","salario","fecha"],
    contenido:`CERTIFICACIÓN LABORAL\n\n{{empresa_nombre}}, NIT {{empresa_nit}}, certifica que {{nombre_empleado}}, identificado con C.C. {{documento_empleado}}, labora en esta empresa desde el {{fecha_ingreso}} desempeñando el cargo de {{cargo}}, con un salario mensual de {{salario}}.\n\nSe expide a solicitud del interesado en {{ciudad}} el {{fecha}}.`,
    pais:"CO", obligatorio:false },
]

/* ═══════════════════════════════════════════════════
   SEGUROS / PÓLIZAS
   ═══════════════════════════════════════════════════ */
const TIPOS_SEGURO = [
  { id:"rcextra",    label:"RC Extracontractual",    icon:"🛡", color:"#B91C1C" },
  { id:"todo_riesgo",label:"Todo Riesgo Construcción", icon:"🏗", color:"#3B3B3B" },
  { id:"cumplimiento",label:"Cumplimiento",           icon:"✅", color:"#111111" },
  { id:"calidad",    label:"Calidad / Estabilidad",  icon:"🔍", color:"#5B3A8C" },
  { id:"prestaciones",label:"Prestaciones Sociales",  icon:"👷", color:"#8C6A00" },
  { id:"vehicular",  label:"Vehicular / SOAT",       icon:"🚗", color:"#0D5E6E" },
  { id:"otro",       label:"Otro seguro",            icon:"📋", color:"#555" },
]

const SAMPLE_SEGUROS = [
  { id:"s1", tipo:"todo_riesgo", aseguradora:"Seguros Bolívar", poliza:"POL-2026-001245", proyecto:"Casa Chicó Norte",
    valor_asegurado:"$120.000.000", prima:"$3.600.000", vigencia_inicio:"2026-01-15", vigencia_fin:"2026-07-15",
    beneficiario:"Andrés Mejía Ruiz", estado:"vigente", notas:"Cubre daños durante ejecución de obra" },
  { id:"s2", tipo:"rcextra", aseguradora:"Sura", poliza:"RC-2026-778899", proyecto:"General empresa",
    valor_asegurado:"$500.000.000", prima:"$8.500.000", vigencia_inicio:"2026-01-01", vigencia_fin:"2026-12-31",
    beneficiario:"Habitaris S.A.S", estado:"vigente", notas:"Responsabilidad civil por daños a terceros" },
  { id:"s3", tipo:"cumplimiento", aseguradora:"Liberty Seguros", poliza:"CUM-2025-556677", proyecto:"Oficina 301 WTC",
    valor_asegurado:"$85.000.000", prima:"$2.125.000", vigencia_inicio:"2025-06-01", vigencia_fin:"2026-06-01",
    beneficiario:"TechStar S.A.S", estado:"por_vencer", notas:"Garantía de cumplimiento del contrato" },
  { id:"s4", tipo:"calidad", aseguradora:"Seguros Bolívar", poliza:"CAL-2025-112233", proyecto:"Apto 502 Rosales",
    valor_asegurado:"$45.000.000", prima:"$675.000", vigencia_inicio:"2025-03-01", vigencia_fin:"2030-03-01",
    beneficiario:"María Fernanda Gómez", estado:"vigente", notas:"Garantía de estabilidad de obra — 5 años" },
]

/* ═══════════════════════════════════════════════════
   PROCESOS LEGALES
   ═══════════════════════════════════════════════════ */
const ESTADOS_PROCESO = [
  { id:"abierto",   label:"Abierto",     color:"#3B3B3B", bg:"#F0F0F0" },
  { id:"en_curso",  label:"En curso",    color:"#8C6A00", bg:"#FFF8EE" },
  { id:"favorable", label:"Favorable",   color:"#111111", bg:"#EBEBEB" },
  { id:"cerrado",   label:"Cerrado",     color:"#555",    bg:"#F5F5F5" },
  { id:"perdido",   label:"Desfavorable",color:"#B91C1C", bg:"#FDF0F0" },
]

const SAMPLE_PROCESOS = [
  { id:"p1", tipo:"Reclamación de garantía", contraparte:"Proveedor XYZ Pisos",
    proyecto:"Oficina 301 WTC", descripcion:"Reclamación por defectos en piso laminado instalado. Presentó levantamiento a los 3 meses.",
    estado:"en_curso", fecha_inicio:"2026-01-20", abogado:"Dr. Martín Velásquez",
    valor_pretension:"$8.500.000", seguimiento:[
      { fecha:"2026-01-20", nota:"Se envía carta de reclamación al proveedor" },
      { fecha:"2026-01-30", nota:"Proveedor responde negando responsabilidad" },
      { fecha:"2026-02-10", nota:"Se envía informe pericial con registro fotográfico" },
      { fecha:"2026-02-20", nota:"Reunión de conciliación programada para marzo 5" },
    ] },
  { id:"p2", tipo:"Incumplimiento contractual", contraparte:"Cliente: Roberto Pineda",
    proyecto:"Remodelación Apto 801 Virrey", descripcion:"Cliente se rehúsa a pagar saldo final ($18M) alegando inconformidad no sustentada.",
    estado:"abierto", fecha_inicio:"2026-02-01", abogado:"Dra. Carolina Mendoza",
    valor_pretension:"$18.000.000", seguimiento:[
      { fecha:"2026-02-01", nota:"Se envía carta de cobro prejudicial" },
      { fecha:"2026-02-15", nota:"Sin respuesta del cliente. Se prepara demanda ejecutiva." },
    ] },
]

/* ═══════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════ */
export default function Legal() {
  const [tab, setTab] = useState("plantillas")
  const [plantillas, setPlantillas] = useState(() => load("plantillas") || PLANTILLAS_SEED)
  const [documentos, setDocumentos] = useState(() => load("documentos_gen") || [])
  const [seguros, setSeguros] = useState(() => load("seguros") || SAMPLE_SEGUROS)
  const [procesos, setProcesos] = useState(() => load("procesos") || SAMPLE_PROCESOS)
  const [search, setSearch] = useState("")
  const [catFiltro, setCatFiltro] = useState("all")
  const [selPlantilla, setSelPlantilla] = useState(null)
  const [selSeguro, setSelSeguro] = useState(null)
  const [selProceso, setSelProceso] = useState(null)
  const [editSeguro, setEditSeguro] = useState(null)
  const [editProceso, setEditProceso] = useState(null)
  const [genDoc, setGenDoc] = useState(null) // { plantilla, variables:{} }

  useEffect(() => save("plantillas", plantillas), [plantillas])
  useEffect(() => save("documentos_gen", documentos), [documentos])
  useEffect(() => save("seguros", seguros), [seguros])
  useEffect(() => save("procesos", procesos), [procesos])

  /* Stats */
  const seguroStats = useMemo(() => {
    const vigentes = seguros.filter(s => new Date(s.vigencia_fin) >= new Date())
    const porVencer = seguros.filter(s => { const d = daysUntil(s.vigencia_fin); return d >= 0 && d <= 60 })
    const vencidos = seguros.filter(s => new Date(s.vigencia_fin) < new Date())
    return { total:seguros.length, vigentes:vigentes.length, porVencer:porVencer.length, vencidos:vencidos.length }
  }, [seguros])

  /* ═══ PLANTILLAS TAB ═══ */
  const renderPlantillas = () => {
    const filtradas = plantillas.filter(p => {
      if(catFiltro !== "all" && p.cat !== catFiltro) return false
      if(search) return p.nombre.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase())
      return true
    })

    return (
      <div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, alignItems:"center" }}>
          <select value={catFiltro} onChange={e=>setCatFiltro(e.target.value)}
            style={{ ...F, padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, background:"#fff" }}>
            <option value="all">Todas las categorías</option>
            {CATEGORIAS_DOC.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
          <div style={{ flex:1, minWidth:180 }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar plantilla…"
              style={{ ...F, width:"100%", padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, boxSizing:"border-box" }} />
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12 }}>
          {filtradas.map(p => {
            const cat = CATEGORIAS_DOC.find(c=>c.id===p.cat)
            return (
              <div key={p.id} onClick={()=>setSelPlantilla(p.id)}
                style={{ background:"#fff", border:`1px solid ${C.border}`, borderLeft:`3px solid ${cat?.color}`,
                  borderRadius:10, padding:18, cursor:"pointer", boxShadow:C.shadow, transition:"all .15s" }}
                onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
                onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
                <div style={{ display:"flex", gap:6, marginBottom:8 }}>
                  <Badge color={cat?.color} bg={cat?.color+"18"}>{cat?.icon} {cat?.label}</Badge>
                </div>
                <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>{p.nombre}</div>
                <div style={{ ...F, fontSize:11, color:C.inkLight, lineHeight:1.5, marginBottom:8,
                  display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {p.desc}
                </div>
                <div style={{ ...F, fontSize:10, color:C.inkLight }}>
                  📝 {p.variables.length} campos · {p.pais === "CO" ? "🇨🇴" : "🇪🇸"}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  /* ── Plantilla detail / doc generator ── */
  const renderPlantillaDetail = () => {
    const pl = selPlantilla ? plantillas.find(p=>p.id===selPlantilla) : null
    if(!pl) return null
    const cat = CATEGORIAS_DOC.find(c=>c.id===pl.cat)

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setSelPlantilla(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:720,
          width:"100%", maxHeight:"88vh", overflow:"auto", padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <Badge color={cat?.color} bg={cat?.color+"18"}>{cat?.icon} {cat?.label}</Badge>
              <h2 style={{ ...F, fontSize:18, fontWeight:700, color:C.ink, margin:"8px 0 4px" }}>{pl.nombre}</h2>
              <p style={{ ...F, fontSize:12, color:C.inkLight, margin:0 }}>{pl.desc}</p>
            </div>
            <button onClick={()=>setSelPlantilla(null)} style={{ ...F, fontSize:18, color:C.inkLight, background:"none", border:"none", cursor:"pointer" }}>✕</button>
          </div>

          <div style={{ marginBottom:16 }}>
            <div style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid, marginBottom:6 }}>Campos variables:</div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {pl.variables.map(v => <Badge key={v} color={C.info} bg={C.infoBg}>{`{{${v}}}`}</Badge>)}
            </div>
          </div>

          {/* Preview */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:20, marginBottom:16,
            maxHeight:300, overflow:"auto" }}>
            <pre style={{ ...F, fontSize:11, color:C.inkMid, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>
              {pl.contenido}
            </pre>
          </div>

          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{ setGenDoc({ plantilla:pl, variables:{} }); setSelPlantilla(null) }}
              style={{ ...F, padding:"8px 20px", fontSize:12, fontWeight:700, color:"#fff",
                background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              📝 Generar documento
            </button>
            <button style={{ ...F, padding:"8px 18px", fontSize:12, color:C.inkMid, background:C.bg,
              border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              ✏️ Editar plantilla
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Document generator modal ── */
  const renderGenDoc = () => {
    if(!genDoc) return null
    const { plantilla, variables } = genDoc
    const setVar = (k,v) => setGenDoc(prev => ({ ...prev, variables:{ ...prev.variables, [k]:v }}))

    // Auto-fill empresa
    const autoVars = { empresa_nombre:"Habitaris S.A.S", empresa_nit:"901.922.136-8",
      rep_legal:"Laura Sánchez Díaz", ciudad:"Bogotá D.C.", fecha:new Date().toLocaleDateString("es-CO",{ day:"numeric", month:"long", year:"numeric" }) }

    const preview = plantilla.contenido.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || autoVars[key] || `[${key}]`
    })

    const guardar = () => {
      const doc = { id:genId(), plantillaId:plantilla.id, titulo:`${plantilla.nombre} — ${variables[plantilla.variables[0]]||"Sin datos"}`,
        contenido:preview, variables:{...autoVars,...variables}, fecha:new Date().toISOString() }
      setDocumentos(prev => [...prev, doc])
      setGenDoc(null)
      alert("✅ Documento generado y guardado")
    }

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setGenDoc(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:800,
          width:"100%", maxHeight:"90vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, color:C.ink, marginBottom:4 }}>📝 Generar: {plantilla.nombre}</h2>
          <p style={{ ...F, fontSize:11, color:C.inkLight, marginBottom:16 }}>Completa los campos y genera el documento.</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            {plantilla.variables.map(v => (
              <div key={v}>
                <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>{v.replace(/_/g," ")}</label>
                <input value={variables[v]||""} onChange={e=>setVar(v,e.target.value)}
                  style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
              </div>
            ))}
          </div>

          {/* Live preview */}
          <div style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid, marginBottom:6 }}>Vista previa:</div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:20, marginBottom:16,
            maxHeight:300, overflow:"auto" }}>
            <pre style={{ ...F, fontSize:11, color:C.ink, lineHeight:1.7, whiteSpace:"pre-wrap", margin:0 }}>{preview}</pre>
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button onClick={()=>setGenDoc(null)}
              style={{ ...F, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              Cancelar
            </button>
            <button style={{ ...F, padding:"8px 18px", fontSize:12, color:C.info, background:C.infoBg,
              border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
              ✍️ Enviar a Firma Digital
            </button>
            <button onClick={guardar}
              style={{ ...F, padding:"8px 24px", fontSize:12, fontWeight:700, color:"#fff", background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              💾 Guardar documento
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══ SEGUROS TAB ═══ */
  const renderSeguros = () => (
    <div>
      {/* Stats */}
      <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        {[
          { label:"Total pólizas", val:seguroStats.total, icon:"🛡" },
          { label:"Vigentes", val:seguroStats.vigentes, icon:"✅" },
          { label:"Por vencer (60d)", val:seguroStats.porVencer, icon:"⏳", warn:seguroStats.porVencer>0 },
          { label:"Vencidas", val:seguroStats.vencidos, icon:"🔴", danger:seguroStats.vencidos>0 },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, minWidth:120, padding:"10px 14px",
            background: s.danger ? C.dangerBg : s.warn ? C.warningBg : "#fff",
            border:`1px solid ${s.danger ? C.danger+"33" : s.warn ? C.warning+"33" : C.border}`, borderRadius:8 }}>
            <div style={{ ...F, fontSize:9, color:C.inkLight }}>{s.icon} {s.label}</div>
            <div style={{ ...F, fontSize:18, fontWeight:700, color: s.danger ? C.danger : s.warn ? C.warning : C.ink }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar póliza, proyecto, aseguradora…"
            style={{ ...F, width:"100%", padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, boxSizing:"border-box" }} />
        </div>
        <button onClick={()=>setEditSeguro({ id:genId(), tipo:"todo_riesgo", aseguradora:"", poliza:"", proyecto:"",
          valor_asegurado:"", prima:"", vigencia_inicio:"", vigencia_fin:"", beneficiario:"", estado:"vigente", notas:"" })}
          style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:700, color:"#fff",
            background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
          + Nueva póliza
        </button>
      </div>

      {/* List */}
      {seguros.map(s => {
        const tipo = TIPOS_SEGURO.find(t=>t.id===s.tipo)
        const d = daysUntil(s.vigencia_fin)
        const vencido = d < 0
        const porVencer = d >= 0 && d <= 60

        return (
          <div key={s.id} onClick={()=>setSelSeguro(s.id)}
            style={{ display:"flex", gap:14, alignItems:"center", padding:"14px 18px",
              background:"#fff", border:`1px solid ${vencido ? C.danger+"44" : porVencer ? C.warning+"44" : C.border}`,
              borderRadius:10, marginBottom:8, cursor:"pointer", boxShadow:C.shadow, transition:"all .15s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
            <div style={{ width:42, height:42, borderRadius:10, background:tipo?.color+"15",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
              {tipo?.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink }}>{tipo?.label}</div>
              <div style={{ ...F, fontSize:11, color:C.inkLight }}>{s.aseguradora} · Póliza: {s.poliza}</div>
              <div style={{ ...F, fontSize:10, color:C.inkLight }}>{s.proyecto} · Beneficiario: {s.beneficiario}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{s.valor_asegurado}</div>
              <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(s.vigencia_inicio)} → {fmtDate(s.vigencia_fin)}</div>
              <div style={{ marginTop:4 }}>
                <Badge color={vencido ? C.danger : porVencer ? C.warning : C.accent}
                  bg={vencido ? C.dangerBg : porVencer ? C.warningBg : C.accentBg}>
                  {vencido ? `Vencida hace ${Math.abs(d)}d` : porVencer ? `Vence en ${d}d` : "Vigente"}
                </Badge>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  /* ── Seguro editor ── */
  const renderEditSeguro = () => {
    if(!editSeguro) return null
    const isNew = !seguros.find(s=>s.id===editSeguro.id)
    const upd = (k,v) => setEditSeguro(prev=>({...prev,[k]:v}))
    const guardar = () => {
      if(isNew) setSeguros(prev=>[...prev,editSeguro])
      else setSeguros(prev=>prev.map(s=>s.id===editSeguro.id?editSeguro:s))
      setEditSeguro(null)
    }
    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setEditSeguro(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:580,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, color:C.ink, marginBottom:16 }}>{isNew?"➕ Nueva póliza":"✏️ Editar póliza"}</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              ["tipo","Tipo",true], ["aseguradora","Aseguradora"], ["poliza","Nº Póliza"], ["proyecto","Proyecto"],
              ["valor_asegurado","Valor asegurado"], ["prima","Prima"], ["vigencia_inicio","Inicio vigencia","date"],
              ["vigencia_fin","Fin vigencia","date"], ["beneficiario","Beneficiario"], ["notas","Notas"],
            ].map(([key,label,type]) => (
              <div key={key} style={{ gridColumn: key==="notas"?"1/-1":undefined }}>
                <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>{label}</label>
                {type===true ? (
                  <select value={editSeguro[key]} onChange={e=>upd(key,e.target.value)}
                    style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5 }}>
                    {TIPOS_SEGURO.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                  </select>
                ) : (
                  <input type={type||"text"} value={editSeguro[key]||""} onChange={e=>upd(key,e.target.value)}
                    style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={()=>setEditSeguro(null)}
              style={{ ...F, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>Cancelar</button>
            <button onClick={guardar}
              style={{ ...F, padding:"8px 24px", fontSize:12, fontWeight:700, color:"#fff", background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>💾 Guardar</button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══ PROCESOS TAB ═══ */
  const renderProcesos = () => (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <div style={{ flex:1 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar proceso…"
            style={{ ...F, width:"100%", padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, boxSizing:"border-box" }} />
        </div>
        <button onClick={()=>setEditProceso({ id:genId(), tipo:"", contraparte:"", proyecto:"", descripcion:"",
          estado:"abierto", fecha_inicio:new Date().toISOString().slice(0,10), abogado:"", valor_pretension:"", seguimiento:[] })}
          style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:700, color:"#fff",
            background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
          + Nuevo proceso
        </button>
      </div>

      {procesos.map(p => {
        const est = ESTADOS_PROCESO.find(e=>e.id===p.estado)
        return (
          <div key={p.id} onClick={()=>setSelProceso(p.id)}
            style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:18,
              marginBottom:10, cursor:"pointer", boxShadow:C.shadow, transition:"all .15s" }}
            onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
            onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:6 }}>
              <div>
                <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink }}>{p.tipo}</div>
                <div style={{ ...F, fontSize:11, color:C.inkLight }}>vs. {p.contraparte} · {p.proyecto}</div>
              </div>
              <Badge color={est?.color} bg={est?.bg}>{est?.label}</Badge>
            </div>
            <div style={{ ...F, fontSize:11, color:C.inkMid, marginBottom:6, lineHeight:1.5 }}>{p.descripcion}</div>
            <div style={{ display:"flex", gap:16, ...F, fontSize:10, color:C.inkLight }}>
              <span>👨‍⚖️ {p.abogado}</span>
              <span>💰 {p.valor_pretension}</span>
              <span>📅 {fmtDate(p.fecha_inicio)}</span>
              <span>📝 {p.seguimiento.length} notas</span>
            </div>
          </div>
        )
      })}

      {procesos.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:C.inkLight }}>
          <div style={{ fontSize:32, marginBottom:8 }}>⚖️</div>
          <p style={{ ...F, fontSize:13 }}>No hay procesos legales registrados</p>
        </div>
      )}
    </div>
  )

  /* ── Proceso detail ── */
  const renderProcesoDetail = () => {
    const p = selProceso ? procesos.find(x=>x.id===selProceso) : null
    if(!p) return null
    const est = ESTADOS_PROCESO.find(e=>e.id===p.estado)
    const [newNota, setNewNota] = useState("")

    const addNota = () => {
      if(!newNota.trim()) return
      setProcesos(prev => prev.map(x => x.id===p.id ? { ...x, seguimiento:[...x.seguimiento, { fecha:new Date().toISOString().slice(0,10), nota:newNota }] } : x))
      setNewNota("")
    }

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setSelProceso(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:640,
          width:"100%", maxHeight:"88vh", overflow:"auto", padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <Badge color={est?.color} bg={est?.bg}>{est?.label}</Badge>
              <h2 style={{ ...F, fontSize:18, fontWeight:700, color:C.ink, margin:"8px 0 2px" }}>{p.tipo}</h2>
              <div style={{ ...F, fontSize:12, color:C.inkLight }}>vs. {p.contraparte} · {p.proyecto}</div>
            </div>
            <button onClick={()=>setSelProceso(null)} style={{ ...F, fontSize:18, color:C.inkLight, background:"none", border:"none", cursor:"pointer" }}>✕</button>
          </div>

          <p style={{ ...F, fontSize:12, color:C.inkMid, lineHeight:1.6, marginBottom:16 }}>{p.descripcion}</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Abogado", val:p.abogado },
              { label:"Valor pretensión", val:p.valor_pretension },
              { label:"Fecha inicio", val:fmtDate(p.fecha_inicio) },
            ].map((item,i) => (
              <div key={i} style={{ padding:10, background:C.surface, borderRadius:6 }}>
                <div style={{ ...F, fontSize:9, color:C.inkLight }}>{item.label}</div>
                <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginBottom:10 }}>📋 Seguimiento</div>
          <div style={{ borderLeft:`2px solid ${C.border}`, paddingLeft:16, marginLeft:8, marginBottom:16 }}>
            {p.seguimiento.map((s,i) => (
              <div key={i} style={{ marginBottom:12, position:"relative" }}>
                <div style={{ position:"absolute", left:-22, top:2, width:10, height:10, borderRadius:"50%",
                  background: i===p.seguimiento.length-1 ? C.accent : C.bg, border:`2px solid ${i===p.seguimiento.length-1 ? C.accent : C.border}` }} />
                <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(s.fecha)}</div>
                <div style={{ ...F, fontSize:12, color:C.ink }}>{s.nota}</div>
              </div>
            ))}
          </div>

          {/* Add note */}
          <div style={{ display:"flex", gap:8 }}>
            <input value={newNota} onChange={e=>setNewNota(e.target.value)} placeholder="Añadir nota de seguimiento…"
              onKeyDown={e=>e.key==="Enter"&&addNota()}
              style={{ ...F, flex:1, padding:"7px 12px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:6 }} />
            <button onClick={addNota}
              style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:600, color:"#fff",
                background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              + Nota
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Edit proceso ── */
  const renderEditProceso = () => {
    if(!editProceso) return null
    const isNew = !procesos.find(p=>p.id===editProceso.id)
    const upd = (k,v) => setEditProceso(prev=>({...prev,[k]:v}))
    const guardar = () => {
      if(isNew) setProcesos(prev=>[...prev,editProceso])
      else setProcesos(prev=>prev.map(p=>p.id===editProceso.id?editProceso:p))
      setEditProceso(null)
    }
    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setEditProceso(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:540,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, color:C.ink, marginBottom:16 }}>{isNew?"➕ Nuevo proceso":"✏️ Editar"}</h2>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {[
              ["tipo","Tipo de proceso"], ["contraparte","Contraparte"], ["proyecto","Proyecto vinculado"],
              ["abogado","Abogado responsable"], ["valor_pretension","Valor pretensión"], ["fecha_inicio","Fecha inicio","date"],
            ].map(([key,label,type]) => (
              <div key={key}>
                <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>{label}</label>
                <input type={type||"text"} value={editProceso[key]||""} onChange={e=>upd(key,e.target.value)}
                  style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
              </div>
            ))}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Estado</label>
              <select value={editProceso.estado} onChange={e=>upd("estado",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5 }}>
                {ESTADOS_PROCESO.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Descripción</label>
              <textarea value={editProceso.descripcion||""} onChange={e=>upd("descripcion",e.target.value)} rows={3}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, resize:"vertical", boxSizing:"border-box" }} />
            </div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={()=>setEditProceso(null)}
              style={{ ...F, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>Cancelar</button>
            <button onClick={guardar}
              style={{ ...F, padding:"8px 24px", fontSize:12, fontWeight:700, color:"#fff", background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>💾 Guardar</button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══ DOCS GENERADOS TAB ═══ */
  const renderDocsGenerados = () => (
    <div>
      {documentos.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:C.inkLight }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📄</div>
          <p style={{ ...F, fontSize:13 }}>No hay documentos generados aún. Ve a Plantillas y genera uno.</p>
        </div>
      ) : (
        documentos.map(d => {
          const pl = plantillas.find(p=>p.id===d.plantillaId)
          const cat = CATEGORIAS_DOC.find(c=>c.id===pl?.cat)
          return (
            <div key={d.id} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10,
              padding:16, marginBottom:8, boxShadow:C.shadow }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div>
                  <Badge color={cat?.color} bg={cat?.color+"18"}>{cat?.icon} {cat?.label}</Badge>
                  <div style={{ ...F, fontSize:13, fontWeight:700, color:C.ink, marginTop:4 }}>{d.titulo}</div>
                </div>
                <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDate(d.fecha)}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={{ ...F, padding:"5px 12px", fontSize:10, color:C.info, background:C.infoBg,
                  border:`1px solid ${C.info}33`, borderRadius:4, cursor:"pointer" }}>👁 Ver</button>
                <button style={{ ...F, padding:"5px 12px", fontSize:10, color:C.accent, background:C.accentBg,
                  border:`1px solid ${C.accent}33`, borderRadius:4, cursor:"pointer" }}>✍️ Enviar a firma</button>
                <button style={{ ...F, padding:"5px 12px", fontSize:10, color:C.inkMid, background:C.surface,
                  border:`1px solid ${C.border}`, borderRadius:4, cursor:"pointer" }}>📥 PDF</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  /* ═══════ RENDER ═══════ */
  const tabs = [
    { id:"plantillas",  icon:"📋", label:"Plantillas",       badge:plantillas.length },
    { id:"generados",   icon:"📄", label:"Docs Generados",   badge:documentos.length||null },
    { id:"seguros",     icon:"🛡", label:"Seguros / Pólizas", badge:seguroStats.porVencer+seguroStats.vencidos||null },
    { id:"procesos",    icon:"⚖️", label:"Procesos Legales", badge:procesos.filter(p=>p.estado==="abierto"||p.estado==="en_curso").length||null },
  ]

  return (
    <div style={{ ...F, padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>⚖️ Legal</h1>
        <p style={{ ...F, fontSize:12, color:C.inkLight, margin:0 }}>Plantillas contractuales, gestión de pólizas, seguimiento de procesos legales</p>
      </div>

      <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ ...F, padding:"10px 16px", fontSize:12, fontWeight: tab===t.id?700:500,
              color: tab===t.id ? C.accent : C.inkLight,
              background:"none", border:"none", borderBottom: tab===t.id ? `2px solid ${C.accent}` : "2px solid transparent",
              cursor:"pointer" }}>
            {t.icon} {t.label}
            {t.badge && <span style={{ marginLeft:6, background: tab===t.id?C.accent:C.border, color:"#fff",
              padding:"1px 7px", borderRadius:10, fontSize:10 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {tab === "plantillas" && renderPlantillas()}
      {tab === "generados" && renderDocsGenerados()}
      {tab === "seguros" && renderSeguros()}
      {tab === "procesos" && renderProcesos()}

      {renderPlantillaDetail()}
      {renderGenDoc()}
      {renderEditSeguro()}
      {renderProcesoDetail()}
      {renderEditProceso()}
    </div>
  )
}
