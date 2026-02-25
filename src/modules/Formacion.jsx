import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'

/* ─────── palette ─────── */
const C = {
  ink:"#111", inkMid:"#444", inkLight:"#888",
  bg:"#F5F5F5", surface:"#FFFFFF", border:"#E0E0E0",
  accent:"#111111", accentBg:"#EBEBEB",
  info:"#3B3B3B", infoBg:"#F0F0F0",
  warning:"#8C6A00", warningBg:"#FFF8EE",
  danger:"#B91C1C", dangerBg:"#FDF0F0",
  success:"#111111", successBg:"#EBEBEB",
  shadow:"0 1px 4px rgba(0,0,0,.06)", shadowMd:"0 4px 16px rgba(0,0,0,.10)",
}
const F = { fontFamily:"'DM Sans',sans-serif" }

/* ─────── STORAGE ─────── */
const SK = "hab:formacion:"
const load  = k => { try { return JSON.parse(localStorage.getItem(SK+k)) || null } catch { return null }}
const save  = (k,v) => { localStorage.setItem(SK+k, JSON.stringify(v)); try { window.storage?.set?.(SK+k, JSON.stringify(v)); } catch {} }
const genId = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7)

/* ─────── CATÁLOGO PRE-CARGADO DE FORMACIONES ─────── */
const CATEGORIAS = [
  { id:"legal_sst",  label:"Legal / SST",       icon:"🦺", color:"#B91C1C" },
  { id:"legal_corp", label:"Legal Corporativo",  icon:"⚖️", color:"#3B3B3B" },
  { id:"operativo",  label:"Operativo / Diseño", icon:"🎨", color:"#5B3A8C" },
  { id:"admin",      label:"Administrativo",     icon:"💼", color:"#8C6A00" },
  { id:"tech",       label:"Tecnología / Herramientas", icon:"💻", color:"#0D5E6E" },
  { id:"cliente",    label:"Atención al Cliente", icon:"🤝", color:"#111111" },
]

/* 
   CATÁLOGO SEED — formaciones obligatorias + recomendadas
   por país para empresas de diseño, arquitectura y remodelación
*/
const CATALOGO_SEED = [
  /* ═══════ COLOMBIA ═══════ */
  // Legal / SST (Decreto 1072/2015, Res. 0312/2019)
  { id:"co_sst_induccion", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Inducción SG-SST", duracionMin:60,
    desc:"Inducción obligatoria al Sistema de Gestión de Seguridad y Salud en el Trabajo. Decreto 1072/2015, Art. 2.2.4.6.11.",
    contenido:"Política SST de la empresa, peligros y riesgos del cargo, plan de emergencias, reporte de incidentes, derechos y deberes del trabajador.",
    normativa:"Decreto 1072/2015 · Resolución 0312/2019",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"co_sst_alturas", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Trabajo Seguro en Alturas", duracionMin:480,
    desc:"Curso obligatorio para todo trabajador que realice labores a 1.5m o más sobre nivel inferior. Resolución 4272/2021.",
    contenido:"Marco normativo, sistemas de protección contra caídas, permisos de trabajo, procedimientos de rescate, prácticas en campo.",
    normativa:"Resolución 4272/2021 · Resolución 1409/2012",
    vigenciaMeses:12, renovable:true,
    aplica:["obra","supervisores","instaladores"] },
  { id:"co_sst_primeros_auxilios", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Primeros Auxilios", duracionMin:120,
    desc:"Formación básica en primeros auxilios para brigadistas y personal designado. Decreto 1072/2015.",
    contenido:"Evaluación de la escena, RCP básico, control de hemorragias, inmovilización, quemaduras, traslado de heridos.",
    normativa:"Decreto 1072/2015 · Resolución 0312/2019",
    vigenciaMeses:24, renovable:true,
    aplica:["brigadistas","obra"] },
  { id:"co_sst_emergencias", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Plan de Emergencias y Evacuación", duracionMin:60,
    desc:"Capacitación sobre el plan de emergencias de la empresa: rutas de evacuación, puntos de encuentro, roles.",
    contenido:"Tipos de emergencia, alarmas, roles del brigadista, evacuación, uso de extintores, simulacros.",
    normativa:"Decreto 1072/2015 Art. 2.2.4.6.25",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"co_sst_ergonomia", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Riesgo Biomecánico / Ergonomía", duracionMin:60,
    desc:"Prevención de lesiones osteomusculares por posturas prolongadas, movimientos repetitivos y manejo de cargas.",
    contenido:"Higiene postural en oficina, pausas activas, levantamiento seguro de cargas, diseño del puesto de trabajo.",
    normativa:"Decreto 1072/2015 · GTC 45",
    vigenciaMeses:12, renovable:true,
    aplica:["oficina","todos"] },
  { id:"co_sst_quimicos", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Manejo Seguro de Productos Químicos", duracionMin:60,
    desc:"Identificación y manejo de pinturas, solventes, adhesivos y materiales peligrosos usados en remodelación.",
    contenido:"SGA (Sistema Globalmente Armonizado), hojas de seguridad, almacenamiento, EPP, derrames, disposición.",
    normativa:"Decreto 1496/2018 · GTC 45",
    vigenciaMeses:12, renovable:true,
    aplica:["obra","instaladores"] },
  { id:"co_sst_psicosocial", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Riesgo Psicosocial y Salud Mental", duracionMin:60,
    desc:"Identificación y prevención de factores de riesgo psicosocial: estrés, acoso laboral, burnout.",
    contenido:"Resolución 2646/2008, batería de riesgo psicosocial, estrategias de afrontamiento, canales de apoyo.",
    normativa:"Resolución 2646/2008 · Ley 1616/2013",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"co_sst_electrico", pais:"CO", cat:"legal_sst", obligatorio:true,
    nombre:"Riesgo Eléctrico (RETIE)", duracionMin:120,
    desc:"Seguridad en instalaciones eléctricas durante remodelación. Obligatorio si hay intervención eléctrica.",
    contenido:"RETIE, 5 reglas de oro, bloqueo/etiquetado, EPP dieléctricos, permisos de trabajo.",
    normativa:"RETIE · Resolución 90708/2013",
    vigenciaMeses:24, renovable:true,
    aplica:["instaladores","obra"] },
  { id:"co_sst_espacios", pais:"CO", cat:"legal_sst", obligatorio:false,
    nombre:"Espacios Confinados", duracionMin:120,
    desc:"Procedimientos para trabajos en espacios confinados (sótanos, tanques, ductos).",
    contenido:"Identificación de espacios confinados, monitoreo atmosférico, permisos, rescate.",
    normativa:"Resolución 0491/2020",
    vigenciaMeses:12, renovable:true,
    aplica:["obra"] },

  // Legal Corporativo Colombia
  { id:"co_datos", pais:"CO", cat:"legal_corp", obligatorio:true,
    nombre:"Protección de Datos Personales (Habeas Data)", duracionMin:60,
    desc:"Ley 1581/2012 de protección de datos personales. Obligatorio para todo empleado que maneje datos de clientes.",
    contenido:"Principios de tratamiento de datos, autorización, derechos ARCO, incidentes de seguridad, responsabilidad.",
    normativa:"Ley 1581/2012 · Decreto 1377/2013",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"co_acoso", pais:"CO", cat:"legal_corp", obligatorio:true,
    nombre:"Prevención del Acoso Laboral", duracionMin:60,
    desc:"Ley 1010/2006 de acoso laboral. Todo trabajador debe conocer conductas, mecanismos de denuncia y comité de convivencia.",
    contenido:"Tipos de acoso, comité de convivencia laboral, procedimiento de queja, medidas preventivas y correctivas.",
    normativa:"Ley 1010/2006 · Resolución 2646/2008",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"co_laft", pais:"CO", cat:"legal_corp", obligatorio:false,
    nombre:"Prevención LAFT (Lavado de Activos)", duracionMin:60,
    desc:"Prevención de lavado de activos y financiación del terrorismo. Recomendado para empresas con contratos de alto valor.",
    contenido:"Señales de alerta, debida diligencia, reporte de operaciones sospechosas, SAGRILAFT.",
    normativa:"Circular Externa SFC 055/2016",
    vigenciaMeses:12, renovable:true,
    aplica:["directivos","comercial"] },

  // Operativo / Diseño Colombia
  { id:"co_nsr10", pais:"CO", cat:"operativo", obligatorio:false,
    nombre:"Norma Sismo Resistente NSR-10", duracionMin:120,
    desc:"Conocimiento de la NSR-10 aplicable a diseño y remodelación de estructuras.",
    contenido:"Títulos A (requisitos generales), J (protección contra incendio), K (requisitos complementarios para diseño arquitectónico).",
    normativa:"NSR-10 · Ley 400/1997",
    vigenciaMeses:0, renovable:false,
    aplica:["arquitectos","diseñadores","ingenieros"] },
  { id:"co_pot", pais:"CO", cat:"operativo", obligatorio:false,
    nombre:"Normativa Urbanística y POT", duracionMin:90,
    desc:"Plan de Ordenamiento Territorial, licencias urbanísticas y norma aplicable a proyectos de remodelación.",
    contenido:"Tipos de licencia, normas urbanísticas, usos del suelo, índices, retrocesos, alturas, trámites ante curadurías.",
    normativa:"Decreto 1077/2015 · Decreto 1203/2017",
    vigenciaMeses:0, renovable:false,
    aplica:["arquitectos","directivos"] },
  { id:"co_proc_diseno", pais:"CO", cat:"operativo", obligatorio:true,
    nombre:"Procedimiento Operativo de Diseño Habitaris", duracionMin:90,
    desc:"Protocolo interno de diseño: flujo del proyecto, entregables por fase, revisiones, aprobaciones del cliente.",
    contenido:"Brief → Concepto → Anteproyecto → Proyecto → Detalles técnicos → Planos de obra. Checklist por fase, nomenclatura de archivos.",
    normativa:"Procedimiento interno",
    vigenciaMeses:0, renovable:false,
    aplica:["diseñadores","arquitectos"] },
  { id:"co_proc_obra", pais:"CO", cat:"operativo", obligatorio:true,
    nombre:"Procedimiento Operativo de Obra", duracionMin:90,
    desc:"Protocolo interno de ejecución de obra: acta de inicio, control diario, bitácora, recepción de materiales.",
    contenido:"Acta de vecindad, acta de inicio, bitácora diaria, control de avance, gestión de cambios, entrega parcial/final.",
    normativa:"Procedimiento interno",
    vigenciaMeses:0, renovable:false,
    aplica:["obra","supervisores"] },

  // Administrativo Colombia
  { id:"co_admin_proc", pais:"CO", cat:"admin", obligatorio:true,
    nombre:"Procedimientos Administrativos Internos", duracionMin:60,
    desc:"Protocolo interno: compras, caja chica, viáticos, aprobaciones, archivo documental.",
    contenido:"Flujo de compras, aprobaciones por monto, rendición de viáticos, gestión documental, archivo digital.",
    normativa:"Procedimiento interno",
    vigenciaMeses:0, renovable:false,
    aplica:["administrativos","todos"] },
  { id:"co_admin_factura", pais:"CO", cat:"admin", obligatorio:false,
    nombre:"Facturación Electrónica", duracionMin:60,
    desc:"Normativa y operación de facturación electrónica ante la DIAN.",
    contenido:"Resolución de habilitación, notas crédito/débito, documento soporte, tiempos de envío, contingencia.",
    normativa:"Resolución DIAN 000042/2020",
    vigenciaMeses:0, renovable:false,
    aplica:["administrativos","contabilidad"] },

  // Tecnología Colombia
  { id:"co_bim", pais:"CO", cat:"tech", obligatorio:false,
    nombre:"Metodología BIM", duracionMin:240,
    desc:"Building Information Modeling aplicado a diseño interior y remodelación.",
    contenido:"Conceptos BIM, modelado en Revit, familias, coordinación de disciplinas, LOD, entregables BIM.",
    normativa:"—",
    vigenciaMeses:0, renovable:false,
    aplica:["arquitectos","diseñadores","ingenieros"] },
  { id:"co_soft_diseno", pais:"CO", cat:"tech", obligatorio:false,
    nombre:"Software de Diseño (AutoCAD / SketchUp / Revit)", duracionMin:480,
    desc:"Capacitación en herramientas de diseño utilizadas en la empresa.",
    contenido:"Según software: interfaz, dibujo 2D/3D, renderizado, ploteo, exportación de planos.",
    normativa:"—",
    vigenciaMeses:0, renovable:false,
    aplica:["diseñadores","arquitectos"] },
  { id:"co_suite_hab", pais:"CO", cat:"tech", obligatorio:true,
    nombre:"Uso de la Suite Habitaris", duracionMin:60,
    desc:"Capacitación en el uso de la plataforma de gestión: CRM, formularios, proyectos, RRHH.",
    contenido:"Módulos de la suite, flujo de ofertas, formularios, gestión de proyectos, reportes.",
    normativa:"Procedimiento interno",
    vigenciaMeses:0, renovable:false,
    aplica:["todos"] },

  // Atención al Cliente Colombia
  { id:"co_atencion", pais:"CO", cat:"cliente", obligatorio:true,
    nombre:"Protocolo de Atención al Cliente", duracionMin:60,
    desc:"Estándares de servicio, comunicación con el cliente, manejo de quejas y expectativas.",
    contenido:"Primera impresión, escucha activa, gestión de expectativas, manejo de conflictos, seguimiento post-servicio.",
    normativa:"Procedimiento interno",
    vigenciaMeses:12, renovable:true,
    aplica:["comercial","diseñadores","todos"] },

  /* ═══════ ESPAÑA ═══════ */
  // PRL (Ley 31/1995)
  { id:"es_prl_general", pais:"ES", cat:"legal_sst", obligatorio:true,
    nombre:"Prevención de Riesgos Laborales — General", duracionMin:480,
    desc:"Formación PRL adaptada al puesto de trabajo. Art. 19 LPRL. Obligatoria para todo trabajador.",
    contenido:"Conceptos básicos PRL, riesgos generales y específicos del puesto, medidas preventivas, EPIs, señalización.",
    normativa:"Ley 31/1995 (LPRL) Art. 19 · RD 39/1997",
    vigenciaMeses:0, renovable:false,
    aplica:["todos"] },
  { id:"es_prl_oficina", pais:"ES", cat:"legal_sst", obligatorio:true,
    nombre:"PRL — Pantallas de Visualización de Datos", duracionMin:120,
    desc:"Riesgos ergonómicos en trabajo con ordenadores. Obligatorio para personal de oficina.",
    contenido:"Ergonomía del puesto, fatiga visual, pausas, configuración de pantalla, mobiliario, ejercicios.",
    normativa:"RD 488/1997",
    vigenciaMeses:0, renovable:false,
    aplica:["oficina","diseñadores","administrativos"] },
  { id:"es_prl_construccion", pais:"ES", cat:"legal_sst", obligatorio:true,
    nombre:"PRL — Construcción (20h Convenio)", duracionMin:1200,
    desc:"Formación obligatoria del Convenio General de Construcción para personal que visita/trabaja en obra.",
    contenido:"Parte troncal (14h): riesgos generales en obra, medidas preventivas. Parte específica (6h): según oficio.",
    normativa:"VI CGSC · RD 1627/1997",
    vigenciaMeses:0, renovable:false,
    aplica:["obra","supervisores","arquitectos"] },
  { id:"es_prl_primeros_auxilios", pais:"ES", cat:"legal_sst", obligatorio:true,
    nombre:"Primeros Auxilios", duracionMin:120,
    desc:"Formación en primeros auxilios para personal designado. Art. 20 LPRL.",
    contenido:"Conducta PAS, RCP, DESA, hemorragias, fracturas, quemaduras, intoxicaciones.",
    normativa:"Ley 31/1995 Art. 20",
    vigenciaMeses:24, renovable:true,
    aplica:["brigadistas","designados"] },
  { id:"es_prl_emergencias", pais:"ES", cat:"legal_sst", obligatorio:true,
    nombre:"Plan de Emergencia y Evacuación", duracionMin:60,
    desc:"Actuación ante emergencias: incendio, evacuación, confinamiento.",
    contenido:"Plan de autoprotección, roles, uso de extintores y BIE, rutas de evacuación, simulacros.",
    normativa:"Ley 31/1995 Art. 20 · RD 393/2007",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_prl_coord", pais:"ES", cat:"legal_sst", obligatorio:true,
    nombre:"Coordinación de Actividades Empresariales (CAE)", duracionMin:60,
    desc:"Obligaciones cuando concurren varias empresas en un mismo centro de trabajo (obra).",
    contenido:"RD 171/2004, intercambio de información, instrucciones, vigilancia, recurso preventivo.",
    normativa:"RD 171/2004",
    vigenciaMeses:0, renovable:false,
    aplica:["supervisores","directivos"] },

  // Legal Corporativo España
  { id:"es_rgpd", pais:"ES", cat:"legal_corp", obligatorio:true,
    nombre:"Protección de Datos (RGPD + LOPDGDD)", duracionMin:120,
    desc:"Reglamento General de Protección de Datos y LOPDGDD. Obligatorio para todo personal que maneje datos.",
    contenido:"Principios, bases de legitimación, derechos del interesado, brechas de seguridad, DPD, sanciones.",
    normativa:"Reglamento UE 2016/679 · LO 3/2018",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_acoso", pais:"ES", cat:"legal_corp", obligatorio:true,
    nombre:"Prevención Acoso Sexual y por Razón de Sexo", duracionMin:60,
    desc:"LO 10/2022 obliga a TODAS las empresas a formar a su plantilla. Protocolo de actuación.",
    contenido:"Definiciones legales, identificación de conductas, procedimiento de denuncia, medidas cautelares, confidencialidad.",
    normativa:"LO 3/2007 Art. 48 · LO 10/2022 Art. 12",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_igualdad", pais:"ES", cat:"legal_corp", obligatorio:true,
    nombre:"Igualdad y Plan de Igualdad", duracionMin:60,
    desc:"Sensibilización en igualdad de oportunidades. Plan de igualdad obligatorio si ≥50 empleados.",
    contenido:"Marco normativo, brecha salarial, lenguaje inclusivo, corresponsabilidad, medidas del plan.",
    normativa:"LO 3/2007 · RD 901/2020",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_lgtbi", pais:"ES", cat:"legal_corp", obligatorio:false,
    nombre:"Igualdad LGTBI y Diversidad", duracionMin:60,
    desc:"Ley 4/2023 y RD 1026/2024. Obligatorio para empresas ≥50 empleados desde abril 2025.",
    contenido:"Diversidad sexual e identidad de género, protocolo frente a LGTBIfobia, entornos inclusivos.",
    normativa:"Ley 4/2023 · RD 1026/2024",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_desconexion", pais:"ES", cat:"legal_corp", obligatorio:true,
    nombre:"Desconexión Digital", duracionMin:30,
    desc:"Derecho a la desconexión digital fuera del horario laboral. LOPDGDD Art. 88.",
    contenido:"Política de desconexión, gestión del tiempo digital, prevención de fatiga informática, buenas prácticas.",
    normativa:"LO 3/2018 Art. 88",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_canal_denuncias", pais:"ES", cat:"legal_corp", obligatorio:false,
    nombre:"Canal Interno de Denuncias", duracionMin:30,
    desc:"Ley 2/2023 (Whistleblowing). Obligatorio ≥50 empleados. Formación sobre uso y protección del informante.",
    contenido:"Qué se puede denunciar, cómo funciona el canal, protección del informante, confidencialidad, plazos.",
    normativa:"Ley 2/2023",
    vigenciaMeses:12, renovable:true,
    aplica:["todos"] },
  { id:"es_blanqueo", pais:"ES", cat:"legal_corp", obligatorio:false,
    nombre:"Prevención de Blanqueo de Capitales", duracionMin:60,
    desc:"Ley 10/2010. Obligatorio para promotores inmobiliarios y operaciones >15.000€ en efectivo.",
    contenido:"Debida diligencia, identificación del cliente, operaciones sospechosas, conservación documental.",
    normativa:"Ley 10/2010 Art. 29",
    vigenciaMeses:12, renovable:true,
    aplica:["directivos","comercial"] },

  // Operativo / Diseño España
  { id:"es_cte", pais:"ES", cat:"operativo", obligatorio:false,
    nombre:"Código Técnico de Edificación (CTE)", duracionMin:120,
    desc:"Conocimiento del CTE aplicable a reformas y rehabilitación.",
    contenido:"DB-HE (ahorro energético), DB-SI (incendios), DB-SUA (seguridad de utilización), DB-HS (salubridad).",
    normativa:"RD 314/2006",
    vigenciaMeses:0, renovable:false,
    aplica:["arquitectos","diseñadores","ingenieros"] },
  { id:"es_proc_diseno", pais:"ES", cat:"operativo", obligatorio:true,
    nombre:"Procedimiento Operativo de Diseño Habitaris", duracionMin:90,
    desc:"Protocolo interno de diseño: flujo del proyecto, entregables, revisiones, aprobaciones.",
    contenido:"Brief → Concepto → Anteproyecto → Proyecto ejecutivo → Detalles. Checklist por fase.",
    normativa:"Procedimiento interno",
    vigenciaMeses:0, renovable:false,
    aplica:["diseñadores","arquitectos"] },
  { id:"es_proc_obra", pais:"ES", cat:"operativo", obligatorio:true,
    nombre:"Procedimiento Operativo de Obra / Reforma", duracionMin:90,
    desc:"Protocolo interno de ejecución: acta de replanteo, libro de órdenes, certificaciones.",
    contenido:"Licencia de obra, acta de replanteo, libro de órdenes, certificaciones parciales, acta de recepción.",
    normativa:"Procedimiento interno · LOE",
    vigenciaMeses:0, renovable:false,
    aplica:["obra","supervisores"] },
  { id:"es_residuos", pais:"ES", cat:"operativo", obligatorio:true,
    nombre:"Gestión de Residuos de Construcción (RCD)", duracionMin:60,
    desc:"Plan de gestión de residuos obligatorio en obra. Separación, transporte y gestión autorizada.",
    contenido:"RD 105/2008, tipos de residuos, plan de gestión, documentos de control, gestores autorizados.",
    normativa:"RD 105/2008 · Ley 7/2022",
    vigenciaMeses:0, renovable:false,
    aplica:["obra","supervisores"] },

  // Tecnología España
  { id:"es_bim", pais:"ES", cat:"tech", obligatorio:false,
    nombre:"Metodología BIM", duracionMin:240,
    desc:"Building Information Modeling. Licitación pública ya lo exige en muchos proyectos.",
    contenido:"Conceptos BIM, modelado Revit, IFC, coordinación, LOD, entregables.",
    normativa:"—",
    vigenciaMeses:0, renovable:false,
    aplica:["arquitectos","diseñadores","ingenieros"] },
  { id:"es_suite_hab", pais:"ES", cat:"tech", obligatorio:true,
    nombre:"Uso de la Suite Habitaris", duracionMin:60,
    desc:"Capacitación en el uso de la plataforma de gestión.",
    contenido:"CRM, formularios, proyectos, RRHH, reportes.",
    normativa:"Procedimiento interno",
    vigenciaMeses:0, renovable:false,
    aplica:["todos"] },

  // Atención al Cliente España
  { id:"es_atencion", pais:"ES", cat:"cliente", obligatorio:true,
    nombre:"Protocolo de Atención al Cliente", duracionMin:60,
    desc:"Estándares de servicio, comunicación, gestión de expectativas y reclamaciones.",
    contenido:"Primera impresión, escucha activa, gestión de quejas, libro de reclamaciones, seguimiento.",
    normativa:"Procedimiento interno",
    vigenciaMeses:12, renovable:true,
    aplica:["comercial","diseñadores","todos"] },
]

/* ROLES predefinidos */
const ROLES_PRED = [
  { id:"todos",          label:"Todos los empleados" },
  { id:"directivos",     label:"Directivos / Gerencia" },
  { id:"arquitectos",    label:"Arquitectos" },
  { id:"diseñadores",    label:"Diseñadores de interiores" },
  { id:"ingenieros",     label:"Ingenieros" },
  { id:"obra",           label:"Personal de obra" },
  { id:"supervisores",   label:"Supervisores / Residentes" },
  { id:"instaladores",   label:"Instaladores / Técnicos" },
  { id:"administrativos",label:"Administrativos" },
  { id:"comercial",      label:"Comercial / Ventas" },
  { id:"contabilidad",   label:"Contabilidad / Finanzas" },
  { id:"oficina",        label:"Personal de oficina" },
  { id:"brigadistas",    label:"Brigadistas" },
  { id:"designados",     label:"Designados especiales" },
]

/* ─────── helper fns ─────── */
function fmtDuracion(min) {
  if(!min) return "—"
  if(min < 60) return `${min} min`
  const h = Math.floor(min/60)
  const m = min % 60
  return m ? `${h}h ${m}min` : `${h}h`
}
function fmtDate(d) {
  if(!d) return "—"
  return new Date(d).toLocaleDateString("es-CO",{ day:"2-digit", month:"short", year:"numeric" })
}
function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}
function daysUntil(isoDate) {
  if(!isoDate) return Infinity
  return Math.ceil((new Date(isoDate) - new Date()) / (1000*60*60*24))
}

/* ─────── COMPONENTS ─────── */

/* ── Tab bar ── */
function Tabs({ tabs, active, onChange, style }) {
  return (
    <div style={{ display:"flex", gap:2, borderBottom:`1px solid ${C.border}`, ...style }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ ...F, padding:"10px 18px", fontSize:12, fontWeight:active===t.id?700:500,
            color: active===t.id ? C.accent : C.inkLight,
            background:"none", border:"none", borderBottom: active===t.id ? `2px solid ${C.accent}` : "2px solid transparent",
            cursor:"pointer", transition:"all .15s" }}>
          {t.icon && <span style={{ marginRight:6 }}>{t.icon}</span>}
          {t.label}
          {t.badge != null && <span style={{ marginLeft:6, background: active===t.id ? C.accent : C.border, color:"#fff",
            padding:"1px 7px", borderRadius:10, fontSize:10 }}>{t.badge}</span>}
        </button>
      ))}
    </div>
  )
}

/* ── Badge ── */
function Badge({ children, color, bg, style }) {
  return (
    <span style={{ ...F, display:"inline-block", padding:"2px 10px", borderRadius:10,
      fontSize:10, fontWeight:600, color, background:bg, ...style }}>
      {children}
    </span>
  )
}

/* ── Card ── */
function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:10,
      padding:20, boxShadow:C.shadow, transition:"all .15s", cursor: onClick?"pointer":undefined, ...style }}
      onMouseEnter={e => { if(onClick) e.currentTarget.style.boxShadow=C.shadowMd }}
      onMouseLeave={e => { if(onClick) e.currentTarget.style.boxShadow=C.shadow }}>
      {children}
    </div>
  )
}

/* ── Search input ── */
function SearchInput({ value, onChange, placeholder }) {
  return (
    <div style={{ position:"relative" }}>
      <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:14, opacity:0.4 }}>🔍</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder||"Buscar…"}
        style={{ ...F, width:"100%", padding:"8px 12px 8px 34px", fontSize:12, border:`1px solid ${C.border}`,
          borderRadius:6, outline:"none", boxSizing:"border-box" }}
        onFocus={e => e.target.style.borderColor=C.accent}
        onBlur={e => e.target.style.borderColor=C.border} />
    </div>
  )
}

/* ─────── QUIZ BUILDER / TAKER ─────── */
function QuizEditor({ preguntas, onChange }) {
  const add = () => onChange([...preguntas, { id:genId(), texto:"", opciones:["","","",""], correcta:0 }])
  const upd = (i,field,val) => { const c=[...preguntas]; c[i]={...c[i],[field]:val}; onChange(c) }
  const updOpc = (i,j,val) => { const c=[...preguntas]; const o=[...c[i].opciones]; o[j]=val; c[i]={...c[i],opciones:o}; onChange(c) }
  const rm = i => onChange(preguntas.filter((_,idx)=>idx!==i))

  return (
    <div>
      <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink, marginBottom:10 }}>Cuestionario de evaluación ({preguntas.length} preguntas)</div>
      {preguntas.map((p,i) => (
        <div key={p.id} style={{ border:`1px solid ${C.border}`, borderRadius:8, padding:14, marginBottom:10, background:C.surface }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid }}>Pregunta {i+1}</span>
            <button onClick={()=>rm(i)} style={{ ...F, fontSize:10, color:C.danger, background:"none", border:"none", cursor:"pointer" }}>✕ Eliminar</button>
          </div>
          <input value={p.texto} onChange={e=>upd(i,"texto",e.target.value)} placeholder="Escribe la pregunta…"
            style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, marginBottom:8, boxSizing:"border-box" }} />
          {p.opciones.map((o,j) => (
            <div key={j} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:4 }}>
              <input type="radio" name={`q_${p.id}`} checked={p.correcta===j} onChange={()=>upd(i,"correcta",j)}
                style={{ accentColor:C.accent }} />
              <input value={o} onChange={e=>updOpc(i,j,e.target.value)} placeholder={`Opción ${j+1}`}
                style={{ ...F, flex:1, padding:"5px 8px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:4 }} />
            </div>
          ))}
          <p style={{ ...F, fontSize:10, color:C.inkLight, marginTop:4 }}>● Marca el radio de la respuesta correcta</p>
        </div>
      ))}
      <button onClick={add} style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:600, color:C.accent,
        background:C.accentBg, border:`1px solid ${C.accent}33`, borderRadius:6, cursor:"pointer" }}>
        + Añadir pregunta
      </button>
    </div>
  )
}

function QuizTaker({ preguntas, onComplete }) {
  const [respuestas, setRespuestas] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)

  const handle = (qId, idx) => { if(!submitted) setRespuestas(r => ({...r,[qId]:idx})) }

  const submit = () => {
    let correct = 0
    preguntas.forEach(p => { if(respuestas[p.id] === p.correcta) correct++ })
    const pct = Math.round((correct/preguntas.length)*100)
    setScore(pct)
    setSubmitted(true)
    onComplete(pct)
  }

  const answered = Object.keys(respuestas).length
  const total = preguntas.length
  const pass = score != null && score >= 70

  return (
    <div>
      {!submitted && (
        <div style={{ ...F, fontSize:12, color:C.inkMid, marginBottom:16 }}>
          Responde todas las preguntas. Necesitas <b>70%</b> para aprobar. ({answered}/{total} respondidas)
        </div>
      )}

      {submitted && (
        <div style={{ padding:20, borderRadius:10, marginBottom:20, textAlign:"center",
          background: pass ? C.successBg : C.dangerBg, border:`1px solid ${pass ? C.success : C.danger}33` }}>
          <div style={{ fontSize:40, marginBottom:8 }}>{pass ? "🎉" : "😞"}</div>
          <div style={{ ...F, fontSize:22, fontWeight:700, color: pass ? C.success : C.danger }}>{score}%</div>
          <div style={{ ...F, fontSize:13, color: pass ? C.success : C.danger, marginTop:4 }}>
            {pass ? "¡Aprobado! Formación completada." : "No aprobado. Puedes volver a intentarlo."}
          </div>
        </div>
      )}

      {preguntas.map((p,i) => {
        const userAns = respuestas[p.id]
        const isCorrect = submitted && userAns === p.correcta
        const isWrong = submitted && userAns !== undefined && userAns !== p.correcta

        return (
          <div key={p.id} style={{ border:`1px solid ${submitted ? (isCorrect ? C.success+"55" : isWrong ? C.danger+"55" : C.border) : C.border}`,
            borderRadius:8, padding:14, marginBottom:10, background:"#fff" }}>
            <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink, marginBottom:10 }}>
              {i+1}. {p.texto}
            </div>
            {p.opciones.map((o,j) => {
              if(!o) return null
              const selected = userAns === j
              const correct = submitted && j === p.correcta
              let bg = selected ? C.accentBg : "transparent"
              let border = selected ? C.accent : C.border
              if(submitted) {
                if(correct) { bg = C.successBg; border = C.success }
                else if(selected && !correct) { bg = C.dangerBg; border = C.danger }
              }
              return (
                <label key={j} style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 10px",
                  borderRadius:6, marginBottom:4, cursor: submitted?"default":"pointer",
                  border:`1px solid ${border}`, background:bg, transition:"all .15s" }}
                  onClick={() => handle(p.id, j)}>
                  <input type="radio" name={`take_${p.id}`} checked={selected} readOnly
                    style={{ accentColor: submitted ? (correct ? C.success : C.danger) : C.accent }} />
                  <span style={{ ...F, fontSize:12, color:C.ink }}>{o}</span>
                  {submitted && correct && <span style={{ marginLeft:"auto", fontSize:12 }}>✓</span>}
                </label>
              )
            })}
          </div>
        )
      })}

      {!submitted && (
        <button onClick={submit} disabled={answered<total}
          style={{ ...F, padding:"10px 28px", fontSize:13, fontWeight:700, color:"#fff",
            background: answered<total ? C.inkLight : C.accent, border:"none", borderRadius:8,
            cursor: answered<total ? "not-allowed" : "pointer", marginTop:10 }}>
          Enviar respuestas
        </button>
      )}
    </div>
  )
}

/* ─────── CERTIFICATE PREVIEW ─────── */
function CertificatePreview({ curso, trabajador, fecha, score }) {
  return (
    <div style={{ border:`2px solid ${C.accent}`, borderRadius:12, padding:40, textAlign:"center",
      background:"linear-gradient(135deg, #FFFFFF 0%, #EBEBEB 100%)", maxWidth:600, margin:"0 auto" }}>
      <div style={{ fontSize:12, letterSpacing:3, color:C.inkLight, textTransform:"uppercase", marginBottom:8 }}>Certificado de formación</div>
      <div style={{ width:60, height:2, background:C.accent, margin:"0 auto 20px" }}/>
      <div style={{ ...F, fontSize:10, color:C.inkLight, marginBottom:4 }}>Se certifica que</div>
      <div style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, marginBottom:16 }}>{trabajador}</div>
      <div style={{ ...F, fontSize:10, color:C.inkLight, marginBottom:4 }}>ha completado satisfactoriamente la formación</div>
      <div style={{ ...F, fontSize:16, fontWeight:600, color:C.accent, marginBottom:8 }}>{curso.nombre}</div>
      <div style={{ ...F, fontSize:11, color:C.inkMid, marginBottom:4 }}>Duración: {fmtDuracion(curso.duracionMin)}</div>
      {score != null && <div style={{ ...F, fontSize:11, color:C.inkMid, marginBottom:4 }}>Calificación: {score}%</div>}
      {curso.normativa && curso.normativa !== "—" && curso.normativa !== "Procedimiento interno" &&
        <div style={{ ...F, fontSize:10, color:C.inkLight, marginBottom:16 }}>Normativa: {curso.normativa}</div>
      }
      <div style={{ ...F, fontSize:12, color:C.ink, marginTop:20 }}>{fmtDate(fecha)}</div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:30, paddingTop:20, borderTop:`1px solid ${C.border}` }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:120, borderBottom:`1px solid ${C.ink}`, marginBottom:4 }}/>
          <div style={{ ...F, fontSize:9, color:C.inkLight }}>Responsable de Formación</div>
        </div>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:120, borderBottom:`1px solid ${C.ink}`, marginBottom:4 }}/>
          <div style={{ ...F, fontSize:9, color:C.inkLight }}>Gerencia</div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN MODULE
   ═══════════════════════════════════════════════════ */
export default function Formacion() {
  /* ── state ── */
  const [tab, setTab] = useState("catalogo")
  const [cursos, setCursos] = useState(() => load("cursos") || CATALOGO_SEED)
  const [asignaciones, setAsignaciones] = useState(() => load("asignaciones") || [])
  const [completados, setCompletados] = useState(() => load("completados") || [])
  const [trabajadores, setTrabajadores] = useState(() => load("trabajadores") || [
    { id:"t1", nombre:"Ana García", cargo:"Diseñadora de interiores", roles:["diseñadores","oficina","todos"], pais:"CO" },
    { id:"t2", nombre:"Carlos López", cargo:"Arquitecto", roles:["arquitectos","oficina","todos"], pais:"CO" },
    { id:"t3", nombre:"María Rodríguez", cargo:"Supervisora de obra", roles:["supervisores","obra","todos","brigadistas"], pais:"CO" },
    { id:"t4", nombre:"Pedro Martínez", cargo:"Instalador", roles:["instaladores","obra","todos"], pais:"CO" },
    { id:"t5", nombre:"Laura Sánchez", cargo:"Administrativa", roles:["administrativos","oficina","todos"], pais:"CO" },
    { id:"t6", nombre:"David Torres", cargo:"Comercial", roles:["comercial","oficina","todos"], pais:"CO" },
  ])
  const [paisFiltro, setPaisFiltro] = useState("CO")
  const [catFiltro, setCatFiltro] = useState("all")
  const [search, setSearch] = useState("")
  const [selCurso, setSelCurso] = useState(null)
  const [selTrabajador, setSelTrabajador] = useState(null)
  const [editCurso, setEditCurso] = useState(null)
  const [showQuiz, setShowQuiz] = useState(null) // { cursoId, trabajadorId }
  const [showCert, setShowCert] = useState(null) // completado entry

  /* ── persist ── */
  useEffect(() => save("cursos", cursos), [cursos])
  useEffect(() => save("asignaciones", asignaciones), [asignaciones])
  useEffect(() => save("completados", completados), [completados])
  useEffect(() => save("trabajadores", trabajadores), [trabajadores])

  /* ── derived ── */
  const cursosFilt = useMemo(() => {
    return cursos.filter(c => {
      if(c.pais !== paisFiltro) return false
      if(catFiltro !== "all" && c.cat !== catFiltro) return false
      if(search) {
        const s = search.toLowerCase()
        return c.nombre.toLowerCase().includes(s) || c.desc.toLowerCase().includes(s) || (c.normativa||"").toLowerCase().includes(s)
      }
      return true
    })
  }, [cursos, paisFiltro, catFiltro, search])

  /* stats */
  const stats = useMemo(() => {
    const trab = trabajadores.filter(t => t.pais === paisFiltro)
    const cursosP = cursos.filter(c => c.pais === paisFiltro)
    const obligatorios = cursosP.filter(c => c.obligatorio)
    let totalAsig = 0, totalComp = 0, porVencer = 0, vencidos = 0
    trab.forEach(t => {
      const asig = asignaciones.filter(a => a.trabajadorId===t.id)
      totalAsig += asig.length
      asig.forEach(a => {
        const comp = completados.find(c => c.asignacionId===a.id)
        if(comp) {
          totalComp++
          if(comp.vencimiento) {
            const d = daysUntil(comp.vencimiento)
            if(d < 0) vencidos++
            else if(d <= 60) porVencer++
          }
        }
      })
    })
    return { trabajadores:trab.length, cursos:cursosP.length, obligatorios:obligatorios.length,
      asignados:totalAsig, completados:totalComp, porVencer, vencidos,
      pctComp: totalAsig ? Math.round((totalComp/totalAsig)*100) : 0 }
  }, [trabajadores, cursos, asignaciones, completados, paisFiltro])

  /* ── assign course to worker ── */
  const asignar = (cursoId, trabajadorId) => {
    const exists = asignaciones.find(a => a.cursoId===cursoId && a.trabajadorId===trabajadorId)
    if(exists) return
    setAsignaciones(prev => [...prev, { id:genId(), cursoId, trabajadorId, fechaAsignacion:new Date().toISOString() }])
  }

  /* auto-assign by roles */
  const autoAsignar = () => {
    const cursosP = cursos.filter(c => c.pais === paisFiltro && c.obligatorio)
    const trabP = trabajadores.filter(t => t.pais === paisFiltro)
    let count = 0
    cursosP.forEach(c => {
      trabP.forEach(t => {
        const match = c.aplica.some(r => r === "todos" || t.roles.includes(r))
        if(match) {
          const exists = asignaciones.find(a => a.cursoId===c.id && a.trabajadorId===t.id)
          if(!exists) { asignar(c.id, t.id); count++ }
        }
      })
    })
    if(count) alert(`✅ Se asignaron ${count} formaciones automáticamente`)
    else alert("ℹ️ Todas las formaciones obligatorias ya están asignadas")
  }

  /* complete assignment */
  const completar = (asignacionId, score) => {
    const asig = asignaciones.find(a => a.id===asignacionId)
    if(!asig) return
    const curso = cursos.find(c => c.id===asig.cursoId)
    const vencimiento = curso?.vigenciaMeses ? addMonths(new Date(), curso.vigenciaMeses) : null
    const entry = { id:genId(), asignacionId, cursoId:asig.cursoId, trabajadorId:asig.trabajadorId,
      fecha:new Date().toISOString(), score, vencimiento }
    setCompletados(prev => [...prev.filter(c => c.asignacionId!==asignacionId), entry])
  }

  /* ── Course detail / edit modal ── */
  const renderCursoDetail = () => {
    const curso = selCurso ? cursos.find(c=>c.id===selCurso) : null
    if(!curso) return null
    const asig = asignaciones.filter(a => a.cursoId===curso.id)
    const cat = CATEGORIAS.find(c=>c.id===curso.cat)

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={() => setSelCurso(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:700,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:16 }}>
            <div>
              <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                <Badge color={cat?.color} bg={cat?.color+"18"}>{cat?.icon} {cat?.label}</Badge>
                {curso.obligatorio && <Badge color={C.danger} bg={C.dangerBg}>Obligatorio</Badge>}
                <Badge color={C.inkLight} bg={C.bg}>{curso.pais === "CO" ? "🇨🇴 Colombia" : "🇪🇸 España"}</Badge>
              </div>
              <h2 style={{ ...F, fontSize:20, fontWeight:700, color:C.ink, margin:0 }}>{curso.nombre}</h2>
            </div>
            <button onClick={() => setSelCurso(null)} style={{ ...F, fontSize:18, color:C.inkLight, background:"none", border:"none", cursor:"pointer" }}>✕</button>
          </div>

          <p style={{ ...F, fontSize:13, color:C.inkMid, lineHeight:1.6, marginBottom:12 }}>{curso.desc}</p>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div style={{ padding:12, background:C.surface, borderRadius:8 }}>
              <div style={{ ...F, fontSize:10, color:C.inkLight, marginBottom:2 }}>Duración</div>
              <div style={{ ...F, fontSize:14, fontWeight:600, color:C.ink }}>{fmtDuracion(curso.duracionMin)}</div>
            </div>
            <div style={{ padding:12, background:C.surface, borderRadius:8 }}>
              <div style={{ ...F, fontSize:10, color:C.inkLight, marginBottom:2 }}>Vigencia</div>
              <div style={{ ...F, fontSize:14, fontWeight:600, color:C.ink }}>{curso.vigenciaMeses ? `${curso.vigenciaMeses} meses` : "Sin vencimiento"}</div>
            </div>
          </div>

          {curso.normativa && curso.normativa !== "—" && (
            <div style={{ padding:10, background:C.infoBg, borderRadius:8, marginBottom:12 }}>
              <span style={{ ...F, fontSize:10, fontWeight:600, color:C.info }}>📜 Normativa: </span>
              <span style={{ ...F, fontSize:11, color:C.info }}>{curso.normativa}</span>
            </div>
          )}

          <div style={{ marginBottom:12 }}>
            <div style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid, marginBottom:4 }}>Contenido temático:</div>
            <p style={{ ...F, fontSize:12, color:C.inkMid, lineHeight:1.6, margin:0 }}>{curso.contenido}</p>
          </div>

          <div style={{ marginBottom:12 }}>
            <div style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid, marginBottom:4 }}>Aplica a:</div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {curso.aplica.map(r => {
                const rol = ROLES_PRED.find(rp=>rp.id===r)
                return <Badge key={r} color={C.inkMid} bg={C.bg}>{rol?.label||r}</Badge>
              })}
            </div>
          </div>

          {/* Material (placeholder) */}
          <div style={{ border:`1px dashed ${C.border}`, borderRadius:8, padding:16, textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>📹</div>
            <div style={{ ...F, fontSize:12, color:C.inkLight }}>Material del curso (vídeos, PDFs, presentaciones)</div>
            <div style={{ ...F, fontSize:10, color:C.inkLight, marginTop:4 }}>Sube contenido desde la pestaña de edición del curso</div>
          </div>

          {/* Quiz */}
          {curso.preguntas?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink, marginBottom:8 }}>📝 Cuestionario ({curso.preguntas.length} preguntas)</div>
              <p style={{ ...F, fontSize:11, color:C.inkLight }}>Los trabajadores deben aprobar con mínimo 70% para completar la formación.</p>
            </div>
          )}

          {/* Assigned workers */}
          <div style={{ marginTop:16 }}>
            <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink, marginBottom:10 }}>👥 Trabajadores asignados ({asig.length})</div>
            {asig.length === 0 && <p style={{ ...F, fontSize:11, color:C.inkLight }}>Ningún trabajador asignado aún.</p>}
            {asig.map(a => {
              const t = trabajadores.find(w=>w.id===a.trabajadorId)
              const comp = completados.find(c=>c.asignacionId===a.id)
              const vencido = comp?.vencimiento && daysUntil(comp.vencimiento) < 0
              const porVencer = comp?.vencimiento && daysUntil(comp.vencimiento) >= 0 && daysUntil(comp.vencimiento) <= 60
              return (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0",
                  borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:C.accentBg,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:600, color:C.accent }}>
                    {(t?.nombre||"?")[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{t?.nombre}</div>
                    <div style={{ ...F, fontSize:10, color:C.inkLight }}>{t?.cargo}</div>
                  </div>
                  {comp ? (
                    <div style={{ textAlign:"right" }}>
                      <Badge color={vencido ? C.danger : porVencer ? C.warning : C.success}
                        bg={vencido ? C.dangerBg : porVencer ? C.warningBg : C.successBg}>
                        {vencido ? "⚠️ Vencido" : porVencer ? "⏳ Por vencer" : `✓ ${comp.score||100}%`}
                      </Badge>
                      <div style={{ ...F, fontSize:9, color:C.inkLight, marginTop:2 }}>
                        {fmtDate(comp.fecha)}{comp.vencimiento && ` → ${fmtDate(comp.vencimiento)}`}
                      </div>
                    </div>
                  ) : (
                    <Badge color={C.warning} bg={C.warningBg}>⏳ Pendiente</Badge>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display:"flex", gap:8, marginTop:20 }}>
            <button onClick={() => { setEditCurso({...curso}); setSelCurso(null) }}
              style={{ ...F, padding:"8px 20px", fontSize:12, fontWeight:600, color:C.accent,
                background:C.accentBg, border:`1px solid ${C.accent}33`, borderRadius:6, cursor:"pointer" }}>
              ✏️ Editar curso
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Course editor modal ── */
  const renderEditCurso = () => {
    if(!editCurso) return null
    const isNew = !cursos.find(c=>c.id===editCurso.id)
    const upd = (k,v) => setEditCurso(prev=>({...prev,[k]:v}))

    const guardar = () => {
      if(isNew) setCursos(prev=>[...prev, editCurso])
      else setCursos(prev=>prev.map(c=>c.id===editCurso.id?editCurso:c))
      setEditCurso(null)
    }

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setEditCurso(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:680,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:18, fontWeight:700, color:C.ink, marginBottom:16 }}>
            {isNew ? "➕ Nuevo curso" : "✏️ Editar curso"}
          </h2>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>País</label>
              <select value={editCurso.pais} onChange={e=>upd("pais",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5 }}>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="ES">🇪🇸 España</option>
              </select>
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Categoría</label>
              <select value={editCurso.cat} onChange={e=>upd("cat",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5 }}>
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Nombre del curso</label>
            <input value={editCurso.nombre||""} onChange={e=>upd("nombre",e.target.value)}
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Descripción</label>
            <textarea value={editCurso.desc||""} onChange={e=>upd("desc",e.target.value)} rows={3}
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, resize:"vertical", boxSizing:"border-box" }} />
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Contenido temático</label>
            <textarea value={editCurso.contenido||""} onChange={e=>upd("contenido",e.target.value)} rows={3}
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, resize:"vertical", boxSizing:"border-box" }} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Duración (min)</label>
              <input type="number" value={editCurso.duracionMin||""} onChange={e=>upd("duracionMin",parseInt(e.target.value)||0)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Vigencia (meses, 0=sin venc.)</label>
              <input type="number" value={editCurso.vigenciaMeses||0} onChange={e=>upd("vigenciaMeses",parseInt(e.target.value)||0)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Normativa</label>
              <input value={editCurso.normativa||""} onChange={e=>upd("normativa",e.target.value)}
                style={{ ...F, width:"100%", padding:"7px 10px", fontSize:12, border:`1px solid ${C.border}`, borderRadius:5, boxSizing:"border-box" }} />
            </div>
          </div>

          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
            <label style={{ ...F, display:"flex", gap:6, alignItems:"center", fontSize:12, cursor:"pointer" }}>
              <input type="checkbox" checked={editCurso.obligatorio||false} onChange={e=>upd("obligatorio",e.target.checked)}
                style={{ accentColor:C.accent }} />
              Formación obligatoria
            </label>
            <label style={{ ...F, display:"flex", gap:6, alignItems:"center", fontSize:12, cursor:"pointer" }}>
              <input type="checkbox" checked={editCurso.renovable||false} onChange={e=>upd("renovable",e.target.checked)}
                style={{ accentColor:C.accent }} />
              Renovable periódicamente
            </label>
          </div>

          {/* Material links */}
          <div style={{ marginBottom:16 }}>
            <label style={{ ...F, fontSize:10, fontWeight:600, color:C.inkLight }}>Material (URLs de vídeo/documentos, uno por línea)</label>
            <textarea value={(editCurso.material||[]).join("\n")} rows={3}
              onChange={e=>upd("material",e.target.value.split("\n").filter(l=>l.trim()))}
              placeholder="https://youtube.com/watch?v=...&#10;https://drive.google.com/file/..."
              style={{ ...F, width:"100%", padding:"7px 10px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:5, resize:"vertical", boxSizing:"border-box" }} />
          </div>

          {/* Quiz editor */}
          <QuizEditor preguntas={editCurso.preguntas||[]}
            onChange={p=>upd("preguntas",p)} />

          <div style={{ display:"flex", gap:8, marginTop:20, justifyContent:"flex-end" }}>
            <button onClick={()=>setEditCurso(null)}
              style={{ ...F, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg, border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              Cancelar
            </button>
            <button onClick={guardar}
              style={{ ...F, padding:"8px 24px", fontSize:12, fontWeight:700, color:"#fff", background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              💾 Guardar
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ── Worker detail ── */
  const renderTrabajadorDetail = () => {
    const t = selTrabajador ? trabajadores.find(w=>w.id===selTrabajador) : null
    if(!t) return null
    const asig = asignaciones.filter(a => a.trabajadorId===t.id)
    const comp = completados.filter(c => c.trabajadorId===t.id)

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setSelTrabajador(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:700,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"start", marginBottom:16 }}>
            <div style={{ display:"flex", gap:14, alignItems:"center" }}>
              <div style={{ width:48, height:48, borderRadius:"50%", background:C.accentBg,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:C.accent }}>
                {t.nombre[0]}
              </div>
              <div>
                <h2 style={{ ...F, fontSize:18, fontWeight:700, color:C.ink, margin:0 }}>{t.nombre}</h2>
                <div style={{ ...F, fontSize:12, color:C.inkLight }}>{t.cargo}</div>
                <div style={{ display:"flex", gap:4, marginTop:4 }}>
                  {t.roles.map(r => <Badge key={r} color={C.inkMid} bg={C.bg}>{r}</Badge>)}
                </div>
              </div>
            </div>
            <button onClick={()=>setSelTrabajador(null)} style={{ ...F, fontSize:18, color:C.inkLight, background:"none", border:"none", cursor:"pointer" }}>✕</button>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ ...F, fontSize:11, fontWeight:600, color:C.inkMid }}>Progreso formativo</span>
              <span style={{ ...F, fontSize:11, fontWeight:600, color:C.accent }}>{comp.length}/{asig.length} completadas</span>
            </div>
            <div style={{ height:8, background:C.bg, borderRadius:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${asig.length?(comp.length/asig.length)*100:0}%`,
                background:C.accent, borderRadius:4, transition:"width .3s" }} />
            </div>
          </div>

          {/* Courses */}
          {asig.map(a => {
            const curso = cursos.find(c=>c.id===a.cursoId)
            const c = completados.find(x=>x.asignacionId===a.id)
            const cat = CATEGORIAS.find(x=>x.id===curso?.cat)
            const vencido = c?.vencimiento && daysUntil(c.vencimiento) < 0
            const porVencer = c?.vencimiento && daysUntil(c.vencimiento) >= 0 && daysUntil(c.vencimiento) <= 60

            return (
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0",
                borderBottom:`1px solid ${C.border}` }}>
                <div style={{ width:36, height:36, borderRadius:8, background:cat?.color+"18",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
                  {cat?.icon}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{curso?.nombre}</div>
                  <div style={{ ...F, fontSize:10, color:C.inkLight }}>{fmtDuracion(curso?.duracionMin)} · {curso?.normativa}</div>
                </div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  {c ? (
                    <>
                      <Badge color={vencido ? C.danger : porVencer ? C.warning : C.success}
                        bg={vencido ? C.dangerBg : porVencer ? C.warningBg : C.successBg}>
                        {vencido ? "Vencido" : porVencer ? `Vence ${fmtDate(c.vencimiento)}` : `✓ ${c.score||100}%`}
                      </Badge>
                      <button onClick={()=>setShowCert(c)} title="Ver certificado"
                        style={{ ...F, padding:"4px 8px", fontSize:10, color:C.accent, background:C.accentBg,
                          border:`1px solid ${C.accent}33`, borderRadius:4, cursor:"pointer" }}>
                        📜
                      </button>
                    </>
                  ) : (
                    <>
                      <Badge color={C.warning} bg={C.warningBg}>Pendiente</Badge>
                      {curso?.preguntas?.length > 0 ? (
                        <button onClick={()=>{ setShowQuiz({ cursoId:curso.id, trabajadorId:t.id, asignacionId:a.id }); setSelTrabajador(null) }}
                          style={{ ...F, padding:"4px 10px", fontSize:10, fontWeight:600, color:"#fff",
                            background:C.accent, border:"none", borderRadius:4, cursor:"pointer" }}>
                          📝 Evaluar
                        </button>
                      ) : (
                        <button onClick={()=>completar(a.id, 100)}
                          style={{ ...F, padding:"4px 10px", fontSize:10, fontWeight:600, color:"#fff",
                            background:C.accent, border:"none", borderRadius:4, cursor:"pointer" }}>
                          ✓ Completar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}

          {asig.length === 0 && <p style={{ ...F, fontSize:12, color:C.inkLight, textAlign:"center", padding:20 }}>No tiene formaciones asignadas</p>}
        </div>
      </div>
    )
  }

  /* ── Quiz modal ── */
  const renderQuizModal = () => {
    if(!showQuiz) return null
    const curso = cursos.find(c=>c.id===showQuiz.cursoId)
    const trab = trabajadores.find(t=>t.id===showQuiz.trabajadorId)
    if(!curso?.preguntas?.length) return null

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setShowQuiz(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:640,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <h2 style={{ ...F, fontSize:16, fontWeight:700, color:C.ink, marginBottom:4 }}>📝 Evaluación: {curso.nombre}</h2>
          <p style={{ ...F, fontSize:12, color:C.inkLight, marginBottom:20 }}>Trabajador: {trab?.nombre}</p>
          <QuizTaker preguntas={curso.preguntas} onComplete={(score) => {
            if(score >= 70) completar(showQuiz.asignacionId, score)
          }} />
          <button onClick={()=>setShowQuiz(null)}
            style={{ ...F, marginTop:16, padding:"8px 20px", fontSize:12, color:C.inkMid, background:C.bg,
              border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  /* ── Certificate modal ── */
  const renderCertModal = () => {
    if(!showCert) return null
    const curso = cursos.find(c=>c.id===showCert.cursoId)
    const trab = trabajadores.find(t=>t.id===showCert.trabajadorId)
    if(!curso||!trab) return null

    return (
      <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,.4)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}
        onClick={()=>setShowCert(null)}>
        <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:14, maxWidth:680,
          width:"100%", maxHeight:"85vh", overflow:"auto", padding:28 }}>
          <CertificatePreview curso={curso} trabajador={trab.nombre} fecha={showCert.fecha} score={showCert.score} />
          <div style={{ textAlign:"center", marginTop:20 }}>
            <button onClick={()=>setShowCert(null)}
              style={{ ...F, padding:"8px 24px", fontSize:12, color:C.inkMid, background:C.bg,
                border:`1px solid ${C.border}`, borderRadius:6, cursor:"pointer" }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ═══════ TAB: CATÁLOGO ═══════ */
  const renderCatalogo = () => (
    <div>
      {/* Filters */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", gap:2 }}>
          {[["CO","🇨🇴 Colombia"],["ES","🇪🇸 España"]].map(([code,lbl]) => (
            <button key={code} onClick={()=>setPaisFiltro(code)}
              style={{ ...F, padding:"6px 14px", fontSize:11, fontWeight: paisFiltro===code?700:500,
                color: paisFiltro===code?"#fff":C.inkMid,
                background: paisFiltro===code?C.accent:C.surface,
                border:`1px solid ${paisFiltro===code?C.accent:C.border}`, borderRadius:6, cursor:"pointer" }}>
              {lbl}
            </button>
          ))}
        </div>
        <select value={catFiltro} onChange={e=>setCatFiltro(e.target.value)}
          style={{ ...F, padding:"6px 12px", fontSize:11, border:`1px solid ${C.border}`, borderRadius:6, background:"#fff" }}>
          <option value="all">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <div style={{ flex:1, minWidth:180 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, normativa…" />
        </div>
        <button onClick={()=>setEditCurso({ id:genId(), pais:paisFiltro, cat:"operativo", nombre:"", desc:"", contenido:"",
          normativa:"", duracionMin:60, vigenciaMeses:0, obligatorio:false, renovable:false, aplica:["todos"], preguntas:[], material:[] })}
          style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:700, color:"#fff",
            background:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
          + Nuevo curso
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
        {[
          { label:"Total cursos", val:stats.cursos, icon:"📚" },
          { label:"Obligatorios", val:stats.obligatorios, icon:"⚠️" },
          { label:"Completados", val:`${stats.pctComp}%`, icon:"✅" },
          { label:"Vencidos", val:stats.vencidos, icon:"🔴", danger:stats.vencidos>0 },
          { label:"Por vencer", val:stats.porVencer, icon:"🟡", warning:stats.porVencer>0 },
        ].map((s,i) => (
          <div key={i} style={{ flex:1, minWidth:120, padding:"12px 16px", background: s.danger ? C.dangerBg : s.warning ? C.warningBg : "#fff",
            border:`1px solid ${s.danger ? C.danger+"33" : s.warning ? C.warning+"33" : C.border}`, borderRadius:8 }}>
            <div style={{ ...F, fontSize:10, color:C.inkLight }}>{s.icon} {s.label}</div>
            <div style={{ ...F, fontSize:20, fontWeight:700, color: s.danger ? C.danger : s.warning ? C.warning : C.ink }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Course grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:12 }}>
        {cursosFilt.map(c => {
          const cat = CATEGORIAS.find(x=>x.id===c.cat)
          const asig = asignaciones.filter(a=>a.cursoId===c.id).length
          const comp = completados.filter(x=>x.cursoId===c.id).length
          return (
            <Card key={c.id} onClick={()=>setSelCurso(c.id)}
              style={{ borderLeft:`3px solid ${cat?.color||C.accent}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <Badge color={cat?.color} bg={cat?.color+"18"}>{cat?.icon} {cat?.label}</Badge>
                {c.obligatorio && <Badge color={C.danger} bg={C.dangerBg}>Obligatorio</Badge>}
              </div>
              <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink, marginBottom:4 }}>{c.nombre}</div>
              <div style={{ ...F, fontSize:11, color:C.inkLight, lineHeight:1.5, marginBottom:10,
                display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                {c.desc}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ ...F, fontSize:10, color:C.inkLight }}>
                  ⏱ {fmtDuracion(c.duracionMin)} · {c.vigenciaMeses ? `↻ ${c.vigenciaMeses}m` : "∞"}
                </div>
                <div style={{ ...F, fontSize:10, color:C.inkMid }}>
                  👥 {asig} · ✓ {comp}
                </div>
              </div>
              {c.preguntas?.length > 0 && (
                <div style={{ ...F, fontSize:9, color:C.accent, marginTop:6 }}>📝 {c.preguntas.length} preguntas</div>
              )}
            </Card>
          )
        })}
      </div>
      {cursosFilt.length === 0 && (
        <div style={{ textAlign:"center", padding:40, color:C.inkLight }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📚</div>
          <p style={{ ...F, fontSize:13 }}>No se encontraron cursos con los filtros seleccionados</p>
        </div>
      )}
    </div>
  )

  /* ═══════ TAB: TRABAJADORES ═══════ */
  const renderTrabajadores = () => {
    const tFilt = trabajadores.filter(t => t.pais === paisFiltro)
    return (
      <div>
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
          <div style={{ display:"flex", gap:2 }}>
            {[["CO","🇨🇴"],["ES","🇪🇸"]].map(([code,flag]) => (
              <button key={code} onClick={()=>setPaisFiltro(code)}
                style={{ ...F, padding:"6px 14px", fontSize:11, fontWeight: paisFiltro===code?700:500,
                  color: paisFiltro===code?"#fff":C.inkMid,
                  background: paisFiltro===code?C.accent:C.surface,
                  border:`1px solid ${paisFiltro===code?C.accent:C.border}`, borderRadius:6, cursor:"pointer" }}>
                {flag}
              </button>
            ))}
          </div>
          <button onClick={autoAsignar}
            style={{ ...F, padding:"7px 16px", fontSize:11, fontWeight:600, color:C.info,
              background:C.infoBg, border:`1px solid ${C.info}33`, borderRadius:6, cursor:"pointer" }}>
            🔄 Auto-asignar obligatorias
          </button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px,1fr))", gap:12 }}>
          {tFilt.map(t => {
            const asig = asignaciones.filter(a=>a.trabajadorId===t.id)
            const comp = completados.filter(c=>c.trabajadorId===t.id)
            const vencidos = comp.filter(c=>c.vencimiento && daysUntil(c.vencimiento)<0).length
            const pct = asig.length ? Math.round((comp.length/asig.length)*100) : 0

            return (
              <Card key={t.id} onClick={()=>setSelTrabajador(t.id)}>
                <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:C.accentBg,
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:C.accent }}>
                    {t.nombre[0]}
                  </div>
                  <div>
                    <div style={{ ...F, fontSize:14, fontWeight:700, color:C.ink }}>{t.nombre}</div>
                    <div style={{ ...F, fontSize:11, color:C.inkLight }}>{t.cargo}</div>
                  </div>
                </div>
                {/* Progress */}
                <div style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ ...F, fontSize:10, color:C.inkLight }}>{comp.length}/{asig.length} completadas</span>
                    <span style={{ ...F, fontSize:10, fontWeight:600, color: pct===100 ? C.success : pct>50 ? C.warning : C.danger }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:C.bg, borderRadius:3, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`,
                      background: pct===100 ? C.success : pct>50 ? "#D4840A" : C.danger,
                      borderRadius:3, transition:"width .3s" }} />
                  </div>
                </div>
                {vencidos > 0 && <Badge color={C.danger} bg={C.dangerBg}>⚠️ {vencidos} vencida(s)</Badge>}
              </Card>
            )
          })}
        </div>
        {tFilt.length === 0 && (
          <div style={{ textAlign:"center", padding:40, color:C.inkLight }}>
            <p style={{ ...F, fontSize:13 }}>No hay trabajadores registrados para este país. Vincúlalos desde RRHH.</p>
          </div>
        )}
      </div>
    )
  }

  /* ═══════ TAB: ALERTAS ═══════ */
  const renderAlertas = () => {
    const alertas = []
    asignaciones.forEach(a => {
      const comp = completados.find(c=>c.asignacionId===a.id)
      const curso = cursos.find(c=>c.id===a.cursoId)
      const trab = trabajadores.find(t=>t.id===a.trabajadorId)
      if(!curso || !trab || curso.pais !== paisFiltro) return

      if(!comp) {
        alertas.push({ tipo:"pendiente", curso, trab, asig:a, prioridad: curso.obligatorio?1:3 })
      } else if(comp.vencimiento) {
        const d = daysUntil(comp.vencimiento)
        if(d < 0) alertas.push({ tipo:"vencido", curso, trab, comp, dias:Math.abs(d), prioridad:0 })
        else if(d <= 60) alertas.push({ tipo:"por_vencer", curso, trab, comp, dias:d, prioridad:2 })
      }
    })
    alertas.sort((a,b) => a.prioridad - b.prioridad)

    return (
      <div>
        <div style={{ display:"flex", gap:2, marginBottom:16 }}>
          {[["CO","🇨🇴"],["ES","🇪🇸"]].map(([code,flag]) => (
            <button key={code} onClick={()=>setPaisFiltro(code)}
              style={{ ...F, padding:"6px 14px", fontSize:11, fontWeight: paisFiltro===code?700:500,
                color: paisFiltro===code?"#fff":C.inkMid,
                background: paisFiltro===code?C.accent:C.surface,
                border:`1px solid ${paisFiltro===code?C.accent:C.border}`, borderRadius:6, cursor:"pointer" }}>
              {flag}
            </button>
          ))}
        </div>

        {alertas.length === 0 ? (
          <div style={{ textAlign:"center", padding:40 }}>
            <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
            <p style={{ ...F, fontSize:14, color:C.success, fontWeight:600 }}>Todo al día</p>
            <p style={{ ...F, fontSize:12, color:C.inkLight }}>No hay formaciones pendientes, vencidas ni por vencer.</p>
          </div>
        ) : (
          <div>
            {alertas.map((a,i) => {
              const bgMap = { vencido:C.dangerBg, por_vencer:C.warningBg, pendiente:C.infoBg }
              const colorMap = { vencido:C.danger, por_vencer:C.warning, pendiente:C.info }
              const iconMap = { vencido:"🔴", por_vencer:"🟡", pendiente:"🔵" }
              const lblMap = { vencido:`Vencido hace ${a.dias} días`, por_vencer:`Vence en ${a.dias} días`, pendiente:"Pendiente de completar" }

              return (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 16px",
                  background:bgMap[a.tipo], border:`1px solid ${colorMap[a.tipo]}22`, borderRadius:8, marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>{iconMap[a.tipo]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ ...F, fontSize:12, fontWeight:600, color:C.ink }}>{a.curso.nombre}</div>
                    <div style={{ ...F, fontSize:11, color:C.inkMid }}>{a.trab.nombre} · {a.trab.cargo}</div>
                  </div>
                  <Badge color={colorMap[a.tipo]} bg="rgba(255,255,255,.7)">{lblMap[a.tipo]}</Badge>
                  {a.curso.obligatorio && <Badge color={C.danger} bg="rgba(255,255,255,.7)">Obligatorio</Badge>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* ═══════ TAB: NORMATIVA ═══════ */
  const renderNormativa = () => {
    const normas = paisFiltro === "CO" ? [
      { ley:"Decreto 1072/2015", desc:"Decreto Único Reglamentario del Sector Trabajo. Establece la obligatoriedad del SG-SST.", aplica:"Toda empresa" },
      { ley:"Resolución 0312/2019", desc:"Estándares Mínimos del SG-SST ajustados por tamaño de empresa y nivel de riesgo.", aplica:"Toda empresa" },
      { ley:"Resolución 4272/2021", desc:"Requisitos mínimos de seguridad para trabajo en alturas (≥1.5m).", aplica:"Personal en obra" },
      { ley:"Resolución 2646/2008", desc:"Factores de riesgo psicosocial en el trabajo y determinación del origen de las patologías.", aplica:"Toda empresa" },
      { ley:"Ley 1616/2013", desc:"Ley de Salud Mental. Promoción de la salud mental en ambientes laborales.", aplica:"Toda empresa" },
      { ley:"Ley 1581/2012", desc:"Régimen general de protección de datos personales (Habeas Data).", aplica:"Toda empresa que maneje datos" },
      { ley:"Ley 1010/2006", desc:"Medidas para prevenir, corregir y sancionar el acoso laboral.", aplica:"Toda empresa" },
      { ley:"Decreto 1496/2018", desc:"Sistema Globalmente Armonizado (SGA) para clasificación y etiquetado de productos químicos.", aplica:"Empresas con químicos" },
      { ley:"Resolución 0491/2020", desc:"Requisitos mínimos de seguridad para trabajo en espacios confinados.", aplica:"Personal en obra (si aplica)" },
      { ley:"RETIE", desc:"Reglamento Técnico de Instalaciones Eléctricas. Resolución 90708/2013.", aplica:"Instaladores eléctricos" },
      { ley:"NSR-10", desc:"Norma Sismo Resistente de Colombia. Ley 400/1997 y Decreto 926/2010.", aplica:"Arquitectos e ingenieros" },
    ] : [
      { ley:"Ley 31/1995 (LPRL)", desc:"Ley de Prevención de Riesgos Laborales. Art. 19: formación obligatoria adaptada al puesto.", aplica:"Toda empresa" },
      { ley:"RD 39/1997 (RSP)", desc:"Reglamento de los Servicios de Prevención. Niveles de formación (básico, intermedio, superior).", aplica:"Toda empresa" },
      { ley:"VI CGSC", desc:"VI Convenio General del Sector de la Construcción. Formación por oficios (8h a 20h).", aplica:"Personal en obra" },
      { ley:"RD 1627/1997", desc:"Disposiciones mínimas de seguridad y salud en obras de construcción.", aplica:"Obras de construcción" },
      { ley:"RD 488/1997", desc:"Disposiciones sobre trabajo con pantallas de visualización de datos.", aplica:"Personal de oficina" },
      { ley:"RD 171/2004", desc:"Coordinación de Actividades Empresariales (CAE).", aplica:"Concurrencia empresarial" },
      { ley:"RGPD (UE 2016/679)", desc:"Reglamento General de Protección de Datos de la Unión Europea.", aplica:"Toda empresa con datos" },
      { ley:"LO 3/2018 (LOPDGDD)", desc:"Ley Orgánica de Protección de Datos y Garantía de Derechos Digitales. Art. 88: desconexión digital.", aplica:"Toda empresa" },
      { ley:"LO 3/2007", desc:"Ley de Igualdad. Plan de igualdad obligatorio ≥50 empleados. Protocolo acoso sexual.", aplica:"Toda empresa" },
      { ley:"LO 10/2022", desc:"Ley de garantía integral de la libertad sexual. Formación obligatoria para toda empresa.", aplica:"Toda empresa" },
      { ley:"Ley 4/2023", desc:"Igualdad real de personas trans y derechos LGTBI. RD 1026/2024 para ≥50 empleados.", aplica:"Empresas ≥50" },
      { ley:"Ley 2/2023", desc:"Protección del informante (Whistleblowing). Canal de denuncias obligatorio ≥50 empleados.", aplica:"Empresas ≥50" },
      { ley:"Ley 10/2010", desc:"Prevención del blanqueo de capitales. Obligatorio para promotores inmobiliarios.", aplica:"Sector inmobiliario" },
      { ley:"RD 314/2006 (CTE)", desc:"Código Técnico de la Edificación. Documentos básicos aplicables a reformas.", aplica:"Arquitectos e ingenieros" },
      { ley:"RD 105/2008", desc:"Regulación de residuos de construcción y demolición (RCD).", aplica:"Obras de construcción" },
    ]

    return (
      <div>
        <div style={{ display:"flex", gap:2, marginBottom:16 }}>
          {[["CO","🇨🇴 Colombia"],["ES","🇪🇸 España"]].map(([code,lbl]) => (
            <button key={code} onClick={()=>setPaisFiltro(code)}
              style={{ ...F, padding:"6px 14px", fontSize:11, fontWeight: paisFiltro===code?700:500,
                color: paisFiltro===code?"#fff":C.inkMid,
                background: paisFiltro===code?C.accent:C.surface,
                border:`1px solid ${paisFiltro===code?C.accent:C.border}`, borderRadius:6, cursor:"pointer" }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ background:C.infoBg, border:`1px solid ${C.info}22`, borderRadius:8, padding:14, marginBottom:16 }}>
          <p style={{ ...F, fontSize:12, color:C.info, margin:0 }}>
            📜 Referencia normativa para empresas de <b>diseño, arquitectura y remodelación</b> en {paisFiltro==="CO"?"Colombia":"España"}.
            Verifica siempre la vigencia con tu asesor legal/SST.
          </p>
        </div>

        {normas.map((n,i) => (
          <div key={i} style={{ display:"flex", gap:14, padding:"14px 0", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ minWidth:160 }}>
              <div style={{ ...F, fontSize:12, fontWeight:700, color:C.ink }}>{n.ley}</div>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ ...F, fontSize:12, color:C.inkMid, lineHeight:1.5 }}>{n.desc}</div>
            </div>
            <div style={{ minWidth:130, textAlign:"right" }}>
              <Badge color={C.inkMid} bg={C.bg}>{n.aplica}</Badge>
            </div>
          </div>
        ))}
      </div>
    )
  }

  /* ═══════ RENDER ═══════ */
  const pendientes = asignaciones.filter(a => !completados.find(c=>c.asignacionId===a.id)).length
  const vencidosCount = completados.filter(c => c.vencimiento && daysUntil(c.vencimiento)<0).length
  const alertCount = pendientes + vencidosCount

  return (
    <div style={{ ...F, padding:24 }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ ...F, fontSize:22, fontWeight:700, color:C.ink, margin:"0 0 4px" }}>🎓 Formación</h1>
        <p style={{ ...F, fontSize:12, color:C.inkLight, margin:0 }}>Gestión de formaciones obligatorias, operativas y corporativas</p>
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { id:"catalogo",     icon:"📚", label:"Catálogo de Cursos", badge:stats.cursos },
        { id:"trabajadores", icon:"👥", label:"Trabajadores" },
        { id:"alertas",      icon:"🔔", label:"Alertas", badge: alertCount||null },
        { id:"normativa",    icon:"📜", label:"Normativa" },
      ]} />

      <div style={{ paddingTop:20 }}>
        {tab === "catalogo" && renderCatalogo()}
        {tab === "trabajadores" && renderTrabajadores()}
        {tab === "alertas" && renderAlertas()}
        {tab === "normativa" && renderNormativa()}
      </div>

      {/* Modals */}
      {renderCursoDetail()}
      {renderEditCurso()}
      {renderTrabajadorDetail()}
      {renderQuizModal()}
      {renderCertModal()}
    </div>
  )
}
