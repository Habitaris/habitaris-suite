import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. ADD NEW SERVICES CATALOG after LogoMark component
# ═══════════════════════════════════════════════════════════════
services_block = '''
/* ─── SERVICIOS, ALCANCES Y ENTREGABLES PREDEFINIDOS ─────────── */
const SERVICIOS = [
  {
    id: "arq_nueva", cod: "DAN",
    nombre: "Diseño arquitectónico obra nueva",
    descripcion: "Desarrollamos proyectos desde cero, acompañando al cliente desde la conceptualización hasta la documentación técnica completa.",
    alcances: [
      "Reunión inicial",
      "Levantamiento de información y análisis del lote",
      "Desarrollo de anteproyecto (plantas, cortes, fachadas conceptuales)",
      "Modelado 3D y visualizaciones",
      "Ajustes y desarrollo de proyecto arquitectónico definitivo",
      "Planos técnicos constructivos",
      "Cuadro de áreas",
      "Especificaciones de materiales",
    ],
    entregables: [
      { nombre: "Proceso creativo", horas: 24 },
      { nombre: "Planta arquitectónica propuesta", horas: 24 },
      { nombre: "Cortes longitudinal y transversal", horas: 8 },
      { nombre: "Fachadas", horas: 8 },
      { nombre: "Planta arquitectónica constructiva (cotas y niveles)", horas: 8 },
      { nombre: "Plano de instalaciones hidráulicas", horas: 8 },
      { nombre: "Planta arquitectónica cielo rasos", horas: 8 },
      { nombre: "Planta arquitectónica pisos y enchapes", horas: 8 },
      { nombre: "Planta de iluminación y puntos eléctricos", horas: 24 },
      { nombre: "Tabla de iluminación", horas: 24 },
      { nombre: "Planos de carpinterías, detalles y despieces", horas: 24 },
      { nombre: "Detalles constructivos", horas: 36 },
      { nombre: "Plano de puertas y ventanas", horas: 24 },
      { nombre: "Tabla de acabados y especificaciones", horas: 24 },
      { nombre: "Memoria de calidades", horas: 24 },
      { nombre: "Modelado 3D", horas: 32 },
      { nombre: "Renderizado", horas: 16 },
    ],
  },
  {
    id: "arq_reforma", cod: "DAR",
    nombre: "Diseño arquitectónico reforma",
    descripcion: "Intervenimos espacios existentes para transformarlos funcional y estéticamente, optimizando distribución, iluminación y materialidad.",
    alcances: [
      "Visita técnica y levantamiento del estado actual",
      "Diagnóstico funcional y espacial",
      "Propuesta de redistribución arquitectónica",
      "Modelado 3D del espacio intervenido",
      "Planos técnicos de reforma",
      "Especificaciones de acabados",
      "Detalles constructivos clave",
    ],
    entregables: [
      { nombre: "Proceso creativo", horas: 16 },
      { nombre: "Planta arquitectónica levantamiento", horas: 5 },
      { nombre: "Planta arquitectónica propuesta", horas: 8 },
      { nombre: "Cortes longitudinal y transversal", horas: 3 },
      { nombre: "Planta arquitectónica demoliciones", horas: 4 },
      { nombre: "Planta arquitectónica constructiva (cotas y niveles)", horas: 3 },
      { nombre: "Plano de instalaciones hidráulicas", horas: 2 },
      { nombre: "Planta arquitectónica cielo rasos", horas: 4 },
      { nombre: "Planta arquitectónica pisos y enchapes", horas: 6 },
      { nombre: "Planta de iluminación y puntos eléctricos", horas: 6 },
      { nombre: "Tabla de iluminación", horas: 8 },
      { nombre: "Planos de carpinterías, detalles y despieces", horas: 8 },
      { nombre: "Detalles constructivos", horas: 8 },
      { nombre: "Plano de puertas y ventanas", horas: 8 },
      { nombre: "Tabla de acabados y especificaciones", horas: 16 },
      { nombre: "Memoria de calidades", horas: 16 },
      { nombre: "Modelado 3D", horas: 24 },
      { nombre: "Renderizado", horas: 16 },
    ],
  },
  {
    id: "interiorismo", cod: "DIN",
    nombre: "Diseño de interiores",
    descripcion: "Transforma espacios en experiencias habitables, funcionales y emocionalmente coherentes. Integra función, estética, técnica y bienestar.",
    alcances: [
      "Concepto creativo y moodboard",
      "Propuesta de distribución de mobiliario",
      "Selección de materiales, acabados y paleta cromática",
      "Diseño de iluminación (ambiental, funcional y decorativa)",
      "Diseño de mobiliario a medida (si aplica)",
      "Modelado 3D",
      "Lista de compras y especificaciones",
    ],
    entregables: [
      { nombre: "Proceso creativo", horas: 5 },
      { nombre: "Planta arquitectónica levantamiento", horas: 3 },
      { nombre: "Cortes longitudinal y transversal", horas: 1 },
      { nombre: "Planta de iluminación y puntos eléctricos", horas: 1 },
      { nombre: "Tabla de iluminación", horas: 2 },
      { nombre: "Planos de carpinterías, detalles y despieces", horas: 3 },
      { nombre: "Plano de amueblamiento", horas: 2 },
      { nombre: "Moodboard", horas: 1 },
      { nombre: "Biofilia", horas: 2 },
      { nombre: "Tabla de mobiliario", horas: 6 },
      { nombre: "Lista de compras", horas: 5 },
      { nombre: "Modelado 3D", horas: 6 },
      { nombre: "Renderizado", horas: 6 },
    ],
  },
  {
    id: "obra_integral", cod: "OBR",
    nombre: "Obra integral",
    descripcion: "Gestionamos y ejecutamos el proyecto completo, garantizando coherencia entre diseño y construcción.",
    alcances: [
      "Dirección y supervisión de obra",
      "Coordinación de proveedores y contratistas",
      "Control de calidad y acabados",
      "Cronograma de ejecución",
      "Control de presupuesto",
      "Seguimiento técnico permanente",
      "Entrega final con revisión detallada",
    ],
    entregables: [],
  },
  {
    id: "consultoria", cod: "CON",
    nombre: "Consultoría",
    descripcion: "Asesoramiento personalizado por horas según las necesidades específicas del proyecto.",
    alcances: [],
    entregables: [],
  },
];

'''

# Insert after LogoMark component (after the closing );)
anchor = "/* ─── ENTREGABLES (tu Excel) ─"
if anchor in c:
    c = c.replace(anchor, services_block + anchor)
    changes += 1
    print("  ✓ SERVICIOS catalog added")
else:
    print("  ✗ ENTREGABLES anchor not found")

# ═══════════════════════════════════════════════════════════════
# 2. UPDATE CODIFICATION dropdown — replace old activities
# ═══════════════════════════════════════════════════════════════
# Find the actividadCod select options and update them
# We need to find where the codification select renders
# First let's update the TEMPLATE default
old_template_tipo = '  tipoProyecto: "OBRA", subtipoDiseno: SUBTIPO[1],'
new_template_tipo = '  tipoProyecto: "OBRA", subtipoDiseno: SUBTIPO[1], servicioId: "interiorismo",'

if old_template_tipo in c:
    c = c.replace(old_template_tipo, new_template_tipo)
    changes += 1
    print("  ✓ Template servicioId added")

# ═══════════════════════════════════════════════════════════════
# 3. ADD "Alcances" TAB to offer form
# ═══════════════════════════════════════════════════════════════
old_tabs_offer = '''  { id: "general",    lbl: "General",          en: "General" },'''
new_tabs_offer = '''  { id: "general",    lbl: "General",          en: "General" },
  { id: "alcances",   lbl: "Alcances",         en: "Scope" },'''

if old_tabs_offer in c:
    c = c.replace(old_tabs_offer, new_tabs_offer, 1)  # only first occurrence in the TABS array
    changes += 1
    print("  ✓ Alcances tab added")

# ═══════════════════════════════════════════════════════════════
# 4. ADD TAB RENDER for Alcances
# ═══════════════════════════════════════════════════════════════
old_gen_render = '      {tab === "general"    && <TGen d={d} set={set} offers={offers} />}'
new_gen_render = '''      {tab === "general"    && <TGen d={d} set={set} offers={offers} />}
      {tab === "alcances"   && <TAlcances d={d} set={set} />}'''

if old_gen_render in c:
    c = c.replace(old_gen_render, new_gen_render)
    changes += 1
    print("  ✓ Alcances tab render added")

# ═══════════════════════════════════════════════════════════════
# 5. ADD TAlcances COMPONENT before TBriefing
# ═══════════════════════════════════════════════════════════════
alcances_component = '''
/* ─── ALCANCES Y ENTREGABLES TAB ──────────────────────────────── */
function TAlcances({ d, set }) {
  const [customName, setCustomName] = useState("");
  const [customHoras, setCustomHoras] = useState("");
  
  const servicio = SERVICIOS.find(s => s.id === d.servicioId) || SERVICIOS[2]; // default interiorismo
  const entregablesOferta = d.entregablesOferta || [];
  
  // Init entregables from service if empty
  useEffect(() => {
    if (d.servicioId && (!d.entregablesOferta || d.entregablesOferta.length === 0)) {
      const svc = SERVICIOS.find(s => s.id === d.servicioId);
      if (svc && svc.entregables.length > 0) {
        set("entregablesOferta", svc.entregables.map((e, i) => ({
          id: "ent_" + i, nombre: e.nombre, horasBase: e.horas, horas: e.horas, incluir: true, custom: false,
        })));
      }
    }
  }, [d.servicioId]);

  const handleServicioChange = (id) => {
    set("servicioId", id);
    const svc = SERVICIOS.find(s => s.id === id);
    if (svc) {
      set("actividadCod", svc.cod);
      if (svc.entregables.length > 0) {
        set("entregablesOferta", svc.entregables.map((e, i) => ({
          id: "ent_" + i, nombre: e.nombre, horasBase: e.horas, horas: e.horas, incluir: true, custom: false,
        })));
      } else {
        set("entregablesOferta", []);
      }
    }
  };

  const toggleEntregable = (id) => {
    set("entregablesOferta", entregablesOferta.map(e => e.id === id ? { ...e, incluir: !e.incluir } : e));
  };

  const updateHoras = (id, h) => {
    set("entregablesOferta", entregablesOferta.map(e => e.id === id ? { ...e, horas: Number(h) || 0 } : e));
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    const newE = { id: "custom_" + Date.now(), nombre: customName.trim(), horasBase: Number(customHoras) || 0, horas: Number(customHoras) || 0, incluir: true, custom: true };
    set("entregablesOferta", [...entregablesOferta, newE]);
    setCustomName(""); setCustomHoras("");
  };

  const removeEntregable = (id) => {
    set("entregablesOferta", entregablesOferta.filter(e => e.id !== id));
  };

  const totalHoras = entregablesOferta.filter(e => e.incluir).reduce((s, e) => s + (e.horas || 0), 0);
  const totalEntregables = entregablesOferta.filter(e => e.incluir).length;

  const S = {
    card: { background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"20px 24px", marginBottom:16 },
    sTitle: { fontSize:9, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 14px" },
  };

  return (
    <div className="fade">
      {/* Service selector */}
      <div style={S.card}>
        <p style={S.sTitle}>Servicio</p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
          {SERVICIOS.map(s => (
            <button key={s.id} onClick={() => handleServicioChange(s.id)} style={{
              padding:"8px 16px", border:`1px solid ${d.servicioId === s.id ? C.ink : C.border}`,
              background: d.servicioId === s.id ? C.ink : "#fff", color: d.servicioId === s.id ? "#fff" : C.ink,
              borderRadius:4, fontSize:11, fontWeight: d.servicioId === s.id ? 700 : 500,
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:.3, transition:"all .15s",
            }}>{s.nombre}</button>
          ))}
        </div>
        {servicio.descripcion && (
          <p style={{ fontSize:12, color:C.inkMid, lineHeight:1.6, margin:0, maxWidth:700 }}>{servicio.descripcion}</p>
        )}
      </div>

      {/* Alcances */}
      {servicio.alcances.length > 0 && (
        <div style={S.card}>
          <p style={S.sTitle}>Alcances del servicio</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px" }}>
            {servicio.alcances.map((a, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, padding:"6px 0" }}>
                <span style={{ color:C.ink, fontSize:11, marginTop:1, flexShrink:0 }}>✓</span>
                <span style={{ fontSize:12, color:C.ink, lineHeight:1.4 }}>{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:"flex", gap:12, marginBottom:16 }}>
        <div style={{ flex:1, background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"14px 18px" }}>
          <p style={{ fontSize:8, fontWeight:600, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 4px" }}>Entregables incluidos</p>
          <p style={{ fontSize:22, fontWeight:700, color:C.ink, margin:0 }}>{totalEntregables}</p>
        </div>
        <div style={{ flex:1, background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"14px 18px" }}>
          <p style={{ fontSize:8, fontWeight:600, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 4px" }}>Horas totales</p>
          <p style={{ fontSize:22, fontWeight:700, color:C.ink, margin:0 }}>{totalHoras}h</p>
        </div>
        <div style={{ flex:1, background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"14px 18px" }}>
          <p style={{ fontSize:8, fontWeight:600, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 4px" }}>Días estimados (8h/día)</p>
          <p style={{ fontSize:22, fontWeight:700, color:C.ink, margin:0 }}>{Math.ceil(totalHoras / 8)}</p>
        </div>
      </div>

      {/* Entregables table */}
      {entregablesOferta.length > 0 && (
        <div style={S.card}>
          <p style={S.sTitle}>Entregables</p>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                <th style={{ textAlign:"left", padding:"8px 0", fontSize:8, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, width:30 }}></th>
                <th style={{ textAlign:"left", padding:"8px 0", fontSize:8, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight }}>Entregable</th>
                <th style={{ textAlign:"center", padding:"8px 0", fontSize:8, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, width:80 }}>Hrs base</th>
                <th style={{ textAlign:"center", padding:"8px 0", fontSize:8, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, width:90 }}>Hrs ajustadas</th>
                <th style={{ width:30 }}></th>
              </tr>
            </thead>
            <tbody>
              {entregablesOferta.map(e => (
                <tr key={e.id} style={{ borderBottom:`1px solid ${C.border}`, opacity: e.incluir ? 1 : 0.4, transition:"opacity .15s" }}>
                  <td style={{ padding:"8px 0" }}>
                    <input type="checkbox" checked={e.incluir} onChange={() => toggleEntregable(e.id)}
                      style={{ width:14, height:14, cursor:"pointer", accentColor:C.ink }} />
                  </td>
                  <td style={{ padding:"8px 0", fontSize:12, color:C.ink, fontWeight: e.incluir ? 500 : 400 }}>
                    {e.nombre}
                    {e.custom && <span style={{ marginLeft:6, fontSize:8, padding:"1px 5px", background:C.infoBg, color:C.info, borderRadius:2, fontWeight:600 }}>CUSTOM</span>}
                  </td>
                  <td style={{ textAlign:"center", padding:"8px 0", fontSize:11, color:C.inkLight }}>{e.horasBase}h</td>
                  <td style={{ textAlign:"center", padding:"8px 4px" }}>
                    <input type="number" value={e.horas} onChange={ev => updateHoras(e.id, ev.target.value)}
                      style={{ width:60, textAlign:"center", border:`1px solid ${C.border}`, borderRadius:3, padding:"4px 6px",
                        fontSize:12, fontWeight:600, color:C.ink, fontFamily:"'DM Sans',sans-serif",
                        background: e.horas !== e.horasBase ? "#FFF8E1" : "#fff" }} />
                  </td>
                  <td style={{ padding:"8px 0" }}>
                    {e.custom && (
                      <button onClick={() => removeEntregable(e.id)} style={{ background:"none", border:"none", cursor:"pointer", color:C.error, fontSize:12 }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add custom entregable */}
      <div style={S.card}>
        <p style={S.sTitle}>Añadir entregable personalizado</p>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:8, fontWeight:600, color:C.inkLight, marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Nombre</label>
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Ej: Plano de paisajismo"
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:3, padding:"8px 10px", fontSize:12, fontFamily:"'DM Sans',sans-serif" }}
              onKeyDown={e => e.key === "Enter" && addCustom()} />
          </div>
          <div style={{ width:90 }}>
            <label style={{ display:"block", fontSize:8, fontWeight:600, color:C.inkLight, marginBottom:4, textTransform:"uppercase", letterSpacing:1 }}>Horas</label>
            <input type="number" value={customHoras} onChange={e => setCustomHoras(e.target.value)} placeholder="0"
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:3, padding:"8px 10px", fontSize:12, fontFamily:"'DM Sans',sans-serif", textAlign:"center" }}
              onKeyDown={e => e.key === "Enter" && addCustom()} />
          </div>
          <button onClick={addCustom} style={{
            padding:"8px 16px", background:C.ink, color:"#fff", border:"none", borderRadius:3,
            fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", letterSpacing:.5, whiteSpace:"nowrap",
          }}>+ Añadir</button>
        </div>
      </div>

      {/* Info note for services without entregables */}
      {servicio.entregables.length === 0 && entregablesOferta.length === 0 && (
        <div style={{ padding:"40px 0", textAlign:"center" }}>
          <p style={{ fontSize:13, color:C.inkLight, margin:"0 0 8px" }}>
            {servicio.id === "consultoria" ? "La consultoría se personaliza por horas según necesidades del proyecto." : "Este servicio no tiene entregables predefinidos."}
          </p>
          <p style={{ fontSize:11, color:C.inkLight }}>Puedes añadir entregables personalizados usando el formulario de arriba.</p>
        </div>
      )}
    </div>
  );
}

'''

# Insert before TBriefing
tbriefing_anchor = '/* ─── BRIEFING TAB — Informe de respuestas ────────────────────── */'
if tbriefing_anchor in c:
    c = c.replace(tbriefing_anchor, alcances_component + tbriefing_anchor)
    changes += 1
    print("  ✓ TAlcances component added")
else:
    print("  ✗ TBriefing anchor not found")

# ═══════════════════════════════════════════════════════════════
# 6. ADD entregablesOferta to TEMPLATE
# ═══════════════════════════════════════════════════════════════
old_costos = '  costosDirectos: [],'
new_costos = '  costosDirectos: [], entregablesOferta: [],'
if old_costos in c:
    c = c.replace(old_costos, new_costos, 1)
    changes += 1
    print("  ✓ entregablesOferta added to TEMPLATE")

# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
with open(p, "w") as f: f.write(c)
print(f"\n{'='*50}")
print(f"  {changes} changes applied")
print(f"{'='*50}")
