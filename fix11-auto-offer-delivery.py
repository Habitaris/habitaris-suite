import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. ADD "Generar oferta automática" BUTTON to TAlcances
# ═══════════════════════════════════════════════════════════════
# Find the TAlcances component and add the generation logic + button

# The button needs access to:
# - d.entregablesOferta (entregables with hours)
# - d.servicioId (which service)
# - SERVICIOS catalog
# - set() to update borrador, equipos, etc.
# - store to read team library

# Find the end of TAlcances info note (empty state) and add before the closing </div>
old_alcances_end = '''      {/* Info note for services without entregables */}
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
}'''

new_alcances_end = '''      {/* Info note for services without entregables */}
      {servicio.entregables.length === 0 && entregablesOferta.length === 0 && (
        <div style={{ padding:"40px 0", textAlign:"center" }}>
          <p style={{ fontSize:13, color:C.inkLight, margin:"0 0 8px" }}>
            {servicio.id === "consultoria" ? "La consultoría se personaliza por horas según necesidades del proyecto." : "Este servicio no tiene entregables predefinidos."}
          </p>
          <p style={{ fontSize:11, color:C.inkLight }}>Puedes añadir entregables personalizados usando el formulario de arriba.</p>
        </div>
      )}

      {/* ── GENERAR OFERTA AUTOMÁTICA ── */}
      {totalEntregables > 0 && (servicio.id === "arq_nueva" || servicio.id === "arq_reforma" || servicio.id === "interiorismo") && (
        <div style={{ background:"#111", borderRadius:8, padding:"20px 24px", marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
            <div>
              <p style={{ margin:"0 0 4px", fontSize:14, fontWeight:700, color:"#fff" }}>Generar oferta automática</p>
              <p style={{ margin:0, fontSize:11, color:"#999", lineHeight:1.5 }}>
                Crea el borrador con {totalEntregables} entregables ({totalHoras}h), asigna equipo de diseño,
                calcula APU y genera flujo de caja. Todo editable después.
              </p>
            </div>
            <button onClick={async () => {
              // 1. Read team library for cost/hour
              let costoHoraEquipo = 0;
              let equipoPlantilla = null;
              try {
                const bibR = await store.get("hab:crm:equipos");
                const bib = bibR ? JSON.parse(bibR.value) : [];
                equipoPlantilla = bib.find(e => e.nombre && e.nombre.toLowerCase().includes("diseño")) || bib[0];

                if (equipoPlantilla) {
                  // Read RRHH data to calculate cost/hour
                  const [cR, aR, lR, jR] = await Promise.all([
                    store.get("hab:rrhh:cargos"), store.get("hab:rrhh:activos"),
                    store.get("hab:rrhh:licencias"), store.get("hab:rrhh:jornada"),
                  ]);
                  const cargos = cR ? JSON.parse(cR.value) : [];
                  const activos = aR ? JSON.parse(aR.value) : [];
                  const licencias = lR ? JSON.parse(lR.value) : [];
                  const jornada = jR ? JSON.parse(jR.value) : { hDia:8, diasSemana:5, semanasAnio:50, pctProductivas:75, diasFestivos:18, diasAusencias:5 };

                  const diasLab = jornada.diasSemana * jornada.semanasAnio - (jornada.diasFestivos||18) - (jornada.diasAusencias||5);
                  const hProdAnio = diasLab * jornada.hDia * ((jornada.pctProductivas||75) / 100);

                  // MO cost/hour
                  const moH = (equipoPlantilla.cargos || []).reduce((s, cargo) => {
                    const cargoData = cargos.find(x => x.id === cargo.cargoId);
                    if (!cargoData || !cargoData.salarioBruto) return s;
                    const factor = 1 + ((cargoData.prestaciones||52.18) + (cargoData.segSocial||12.5) + (cargoData.parafiscales||9)) / 100;
                    const costoAnual = cargoData.salarioBruto * 12 * factor;
                    return s + (hProdAnio > 0 ? costoAnual / hProdAnio : 0) * (cargo.cantidad||1);
                  }, 0);

                  // Activos depreciation/hour
                  const eqH = (equipoPlantilla.activosUsados || []).reduce((s, a) => {
                    const activo = activos.find(x => x.id === a.activoId);
                    if (!activo || !activo.valorCompra) return s;
                    const depAnual = activo.valorCompra / (activo.vidaUtilAnios || 5);
                    return s + (depAnual / (activo.usoAnual || 1760)) * (a.cantidad||1);
                  }, 0);

                  // Licencias cost/hour
                  const licH = (equipoPlantilla.licenciasUsadas || []).reduce((s, l) => {
                    const lic = licencias.find(x => x.id === l.licId);
                    if (!lic) return s;
                    return s + ((lic.costoAnual||0) / (hProdAnio||1760)) * (l.cantidad||1);
                  }, 0);

                  costoHoraEquipo = moH + eqH + licH;
                }
              } catch(e) { console.error("Error reading team:", e); }

              // Fallback: use APU params if no team data
              if (costoHoraEquipo === 0) {
                const hAnio = (d.apuHDia||8)*(d.apuDiasSem||5)*(d.apuSemanas||52)*(d.apuPctProductivas||0.6);
                const estr = (d.apuSalarioAnual||0)*(1+(d.apuPrestaciones||0.65))
                  + Number(d.apuLicencias||0) + Number(d.apuEquipos||0) + Number(d.apuAccesorios||0);
                costoHoraEquipo = hAnio > 0 ? estr / hAnio : 25000; // fallback 25k COP/h
              }

              const activos = entregablesOferta.filter(e => e.incluir);
              const uid2 = () => Math.random().toString(36).slice(2,10);

              // 2. Create borrador lines
              const capitulo = {
                id: uid2(), esCapitulo: true,
                nombre: "DISEÑO — " + servicio.nombre.toUpperCase(),
                tipo: "CAP17",
              };

              const lineas = activos.map((ent, i) => ({
                id: uid2(), esCapitulo: false, tipo: "CAP17",
                codigo: servicio.cod + "-" + String(i+1).padStart(2,"0"),
                descripcion: ent.nombre,
                unidad: "h",
                cantidad: ent.horas || 0,
                precioCD: (ent.horas || 0) * costoHoraEquipo,
                apu: {
                  estudios: [{ id: ent.id, nombre: ent.nombre, horas: ent.horas || 0 }],
                  mo: [], subcontratas: [],
                },
              }));

              set("borradorLineas", [capitulo, ...lineas]);

              // 3. Assign team
              if (equipoPlantilla) {
                set("ofertaEquipos", [{
                  id: uid2(),
                  nombre: equipoPlantilla.nombre,
                  cargos: (equipoPlantilla.cargos || []).map(c => ({...c, id: uid2()})),
                  activosUsados: equipoPlantilla.activosUsados || [],
                  licenciasUsadas: equipoPlantilla.licenciasUsadas || [],
                  logItemsUsados: equipoPlantilla.logItemsUsados || [],
                  rendimiento: equipoPlantilla.rendimiento || 1,
                  notas: "Auto-generado desde Alcances",
                }]);
              }

              // 4. Set APU mode to reflect team cost
              if (costoHoraEquipo > 0) {
                set("apuModoHora", "MANUAL");
                set("apuCostoHoraManual", Math.round(costoHoraEquipo));
              }

              // 5. Generate basic cash flow (30% anticipo, 40% avance, 30% entrega)
              const totalCosto = activos.reduce((s, e) => s + (e.horas||0) * costoHoraEquipo, 0);
              const diasEstimados = Math.ceil(totalHoras / 8);
              set("flujoHitos", [
                { id: uid2(), nombre: "Anticipo", pct: 30, monto: Math.round(totalCosto * 0.30), dia: 0 },
                { id: uid2(), nombre: "Avance 50%", pct: 40, monto: Math.round(totalCosto * 0.40), dia: Math.round(diasEstimados * 0.5) },
                { id: uid2(), nombre: "Entrega final", pct: 30, monto: Math.round(totalCosto * 0.30), dia: diasEstimados },
              ]);

              // 6. Set cronograma duration
              set("cronoDias", diasEstimados);
              set("cronoInicio", new Date().toISOString().slice(0,10));

              alert(`✅ Oferta generada:\n• ${lineas.length} partidas de diseño\n• Costo/hora equipo: ${Math.round(costoHoraEquipo).toLocaleString()} COP/h\n• Total: ${Math.round(totalCosto).toLocaleString()} COP\n• Duración estimada: ${diasEstimados} días\n\nRevisa las pestañas Borrador, Equipos y Flujo de caja.`);

            }} style={{
              padding:"12px 28px", background:"#fff", color:"#111", border:"none", borderRadius:6,
              fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              letterSpacing:.5, whiteSpace:"nowrap", transition:"all .15s",
            }}>
              ⚡ Generar oferta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}'''

if old_alcances_end in c:
    c = c.replace(old_alcances_end, new_alcances_end)
    changes += 1
    print("  ✓ 'Generar oferta' button added to TAlcances")
else:
    print("  ✗ TAlcances end not found")


# ═══════════════════════════════════════════════════════════════
# 2. ADD GLOSARIO default data + field to TEMPLATE
# ═══════════════════════════════════════════════════════════════

# Add glosario biblioteca constant
glosario_block = '''
/* ─── GLOSARIO DE TÉRMINOS PREDEFINIDOS ──────────────────────── */
const GLOSARIO_PREDEFINIDO = [
  { id:"g01", termino:"Planta arquitectónica", definicion:"Representación gráfica horizontal a escala de la distribución y dimensiones de los espacios de un nivel." },
  { id:"g02", termino:"Corte o sección", definicion:"Representación gráfica vertical que muestra la relación entre niveles, alturas y elementos constructivos." },
  { id:"g03", termino:"Fachada", definicion:"Representación gráfica de la vista exterior del proyecto, mostrando materiales, proporciones y acabados." },
  { id:"g04", termino:"Planta constructiva", definicion:"Planta con cotas, niveles, ejes y especificaciones técnicas para la ejecución en obra." },
  { id:"g05", termino:"Modelado 3D", definicion:"Representación tridimensional digital del proyecto que permite visualizar espacios, materiales y proporciones." },
  { id:"g06", termino:"Renderizado", definicion:"Imagen fotorrealista generada a partir del modelo 3D que simula iluminación, materiales y ambientación." },
  { id:"g07", termino:"Moodboard", definicion:"Tablero visual de inspiración que reúne referencias de estilo, colores, texturas y mobiliario para definir la dirección estética." },
  { id:"g08", termino:"Memoria de calidades", definicion:"Documento que especifica las marcas, referencias y características técnicas de todos los materiales y acabados del proyecto." },
  { id:"g09", termino:"Carpinterías", definicion:"Elementos de madera, metal o PVC como puertas, ventanas, closets y mobiliario fijo diseñados a medida." },
  { id:"g10", termino:"Biofilia", definicion:"Integración de elementos naturales (vegetación, luz natural, materiales orgánicos) en el diseño para mejorar el bienestar." },
  { id:"g11", termino:"APU", definicion:"Análisis de Precio Unitario. Desglose detallado del costo de una actividad incluyendo materiales, mano de obra, equipos e indirectos." },
  { id:"g12", termino:"AIU", definicion:"Administración, Imprevistos y Utilidad. Porcentaje que se aplica sobre los costos directos para cubrir gastos indirectos del proyecto." },
  { id:"g13", termino:"Cronograma", definicion:"Planificación temporal del proyecto que establece la secuencia, duración y dependencias de cada actividad." },
  { id:"g14", termino:"Alcance", definicion:"Descripción detallada de los trabajos, servicios y entregables incluidos en la propuesta." },
  { id:"g15", termino:"Entregable", definicion:"Producto o documento específico que forma parte del alcance contratado y será entregado al cliente." },
];

'''

# Insert before TIPOS_CAPITULO
anchor_tipos = 'const TIPOS_CAPITULO = ['
if anchor_tipos in c:
    c = c.replace(anchor_tipos, glosario_block + anchor_tipos)
    changes += 1
    print("  ✓ GLOSARIO_PREDEFINIDO added")
else:
    print("  ✗ TIPOS_CAPITULO anchor not found")

# Add glosario fields to TEMPLATE
old_template_org = '  orgNodos: [],'
new_template_org = '''  orgNodos: [],
  // Glosario y configuración de entrega
  glosarioOferta: [], // [{id, termino, definicion, incluir}]
  entregaConfig: {
    incluirAlcance: true,
    incluirEntregables: true,
    incluirCronograma: true,
    incluirOrganigrama: false,
    incluirGlosario: true,
    incluirTerminos: true,
    incluirCondicionesPago: true,
    incluirDesglosePrecio: false,
    terminosCondiciones: "Los plazos indicados son estimados y podrán ajustarse según la complejidad del desarrollo.\\nLos cambios solicitados fuera del alcance descrito se cotizarán por separado.\\nLa propuesta tiene una validez indicada en este documento.\\nEl inicio de los trabajos está sujeto al pago del anticipo acordado.",
  },'''

if old_template_org in c:
    c = c.replace(old_template_org, new_template_org, 1)
    changes += 1
    print("  ✓ Glosario + entregaConfig added to TEMPLATE")
else:
    print("  ✗ orgNodos anchor not found in TEMPLATE")


# ═══════════════════════════════════════════════════════════════
# 3. UPGRADE "Entrega cliente" TAB (TEnt) with configurable toggles
# ═══════════════════════════════════════════════════════════════
# Find the current TEnt component and replace it

# First find the function
import re
tent_match = re.search(r'function TEnt\(\{[^}]+\}\)\s*\{', c)
if tent_match:
    tent_start = tent_match.start()
    # Find the end of TEnt — look for the next top-level function
    # Search for pattern "function T" or "/* ─── " after TEnt
    rest = c[tent_start:]
    # Find matching closing brace by counting
    depth = 0
    tent_end = tent_start
    found_first = False
    for i, ch in enumerate(rest):
        if ch == '{':
            depth += 1
            found_first = True
        elif ch == '}':
            depth -= 1
            if found_first and depth == 0:
                tent_end = tent_start + i + 1
                break

    old_tent = c[tent_start:tent_end]

    new_tent = '''function TEnt({ d, set, r }) {
  const pais = d.pais || "CO";
  const moneda = pais === "CO" ? "COP" : "EUR";
  const fmtN = (n) => n ? new Intl.NumberFormat(pais==="CO"?"es-CO":"es-ES",{ maximumFractionDigits:0 }).format(n) : "0";

  const config = d.entregaConfig || {
    incluirAlcance:true, incluirEntregables:true, incluirCronograma:true,
    incluirOrganigrama:false, incluirGlosario:true, incluirTerminos:true,
    incluirCondicionesPago:true, incluirDesglosePrecio:false,
    terminosCondiciones:"",
  };
  const setConfig = (k, v) => set("entregaConfig", { ...config, [k]: v });

  const glosario = d.glosarioOferta || [];
  const setGlosario = (g) => set("glosarioOferta", g);

  const [addTermino, setAddTermino] = useState("");
  const [addDef, setAddDef] = useState("");

  // Init glosario from predefined if empty
  useEffect(() => {
    if (glosario.length === 0 && typeof GLOSARIO_PREDEFINIDO !== "undefined") {
      setGlosario(GLOSARIO_PREDEFINIDO.map(g => ({ ...g, incluir: true })));
    }
  }, []);

  const servicio = typeof SERVICIOS !== "undefined" ? SERVICIOS.find(s => s.id === d.servicioId) : null;
  const entregablesActivos = (d.entregablesOferta || []).filter(e => e.incluir);
  const totalHoras = entregablesActivos.reduce((s, e) => s + (e.horas||0), 0);

  const S = {
    card: { background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"20px 24px", marginBottom:16 },
    sTitle: { fontSize:9, fontWeight:700, letterSpacing:2.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 14px" },
  };

  const Toggle = ({ label, desc, checked, onChange }) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
      <div>
        <p style={{ margin:0, fontSize:12, fontWeight:600, color:C.ink }}>{label}</p>
        {desc && <p style={{ margin:"2px 0 0", fontSize:10, color:C.inkLight }}>{desc}</p>}
      </div>
      <label style={{ position:"relative", display:"inline-block", width:40, height:22, cursor:"pointer" }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ opacity:0, width:0, height:0 }} />
        <span style={{
          position:"absolute", top:0, left:0, right:0, bottom:0,
          background: checked ? "#111" : "#ccc", borderRadius:22, transition:"all .2s",
        }}/>
        <span style={{
          position:"absolute", top:2, left: checked ? 20 : 2, width:18, height:18,
          background:"#fff", borderRadius:"50%", transition:"all .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)",
        }}/>
      </label>
    </div>
  );

  return (
    <div className="fade">
      {/* Configurador de contenido */}
      <div style={S.card}>
        <p style={S.sTitle}>Configurar propuesta para el cliente</p>
        <p style={{ fontSize:11, color:C.inkLight, margin:"0 0 16px" }}>
          Selecciona qué secciones incluir en el documento que recibirá el cliente.
        </p>
        <Toggle label="Alcance del servicio" desc="Descripción de lo que incluye el servicio contratado"
          checked={config.incluirAlcance} onChange={v => setConfig("incluirAlcance", v)} />
        <Toggle label="Listado de entregables" desc={`${entregablesActivos.length} entregables definidos`}
          checked={config.incluirEntregables} onChange={v => setConfig("incluirEntregables", v)} />
        <Toggle label="Cronograma estimado" desc={`${Math.ceil(totalHoras/8)} días estimados`}
          checked={config.incluirCronograma} onChange={v => setConfig("incluirCronograma", v)} />
        <Toggle label="Organigrama del equipo" desc="Integrantes asignados al proyecto"
          checked={config.incluirOrganigrama} onChange={v => setConfig("incluirOrganigrama", v)} />
        <Toggle label="Glosario de términos" desc={`${glosario.filter(g=>g.incluir).length} términos activos`}
          checked={config.incluirGlosario} onChange={v => setConfig("incluirGlosario", v)} />
        <Toggle label="Términos y condiciones" desc="Cláusulas legales y comerciales"
          checked={config.incluirTerminos} onChange={v => setConfig("incluirTerminos", v)} />
        <Toggle label="Condiciones de pago" desc="Hitos de pago y porcentajes"
          checked={config.incluirCondicionesPago} onChange={v => setConfig("incluirCondicionesPago", v)} />
        <Toggle label="Desglose de precios" desc="Mostrar precios unitarios al cliente (no recomendado para diseño)"
          checked={config.incluirDesglosePrecio} onChange={v => setConfig("incluirDesglosePrecio", v)} />
      </div>

      {/* Glosario editable */}
      {config.incluirGlosario && (
        <div style={S.card}>
          <p style={S.sTitle}>Glosario de términos</p>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:"'DM Sans',sans-serif" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                <th style={{ width:30, padding:"6px 0" }}></th>
                <th style={{ textAlign:"left", padding:"6px 0", fontSize:8, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight }}>Término</th>
                <th style={{ textAlign:"left", padding:"6px 0", fontSize:8, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight }}>Definición</th>
                <th style={{ width:30 }}></th>
              </tr>
            </thead>
            <tbody>
              {glosario.map(g => (
                <tr key={g.id} style={{ borderBottom:`1px solid ${C.border}`, opacity: g.incluir ? 1 : 0.35, transition:"opacity .15s" }}>
                  <td style={{ padding:"6px 0" }}>
                    <input type="checkbox" checked={g.incluir} onChange={() => setGlosario(glosario.map(x => x.id === g.id ? {...x, incluir:!x.incluir} : x))}
                      style={{ width:14, height:14, cursor:"pointer", accentColor:C.ink }} />
                  </td>
                  <td style={{ padding:"6px 4px", fontSize:11, fontWeight:600, color:C.ink, verticalAlign:"top", width:"25%" }}>{g.termino}</td>
                  <td style={{ padding:"6px 4px", fontSize:11, color:C.inkMid, lineHeight:1.4 }}>{g.definicion}</td>
                  <td>
                    {!GLOSARIO_PREDEFINIDO.find(p => p.id === g.id) && (
                      <button onClick={() => setGlosario(glosario.filter(x => x.id !== g.id))}
                        style={{ background:"none", border:"none", cursor:"pointer", color:C.error, fontSize:12 }}>×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Add custom term */}
          <div style={{ display:"flex", gap:8, marginTop:12, alignItems:"flex-end" }}>
            <div style={{ width:"30%" }}>
              <label style={{ display:"block", fontSize:8, fontWeight:600, color:C.inkLight, marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Término</label>
              <input value={addTermino} onChange={e => setAddTermino(e.target.value)} placeholder="Ej: Bioclimática"
                style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:3, padding:"7px 10px", fontSize:11, fontFamily:"'DM Sans',sans-serif" }} />
            </div>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:8, fontWeight:600, color:C.inkLight, marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Definición</label>
              <input value={addDef} onChange={e => setAddDef(e.target.value)} placeholder="Definición del término..."
                style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:3, padding:"7px 10px", fontSize:11, fontFamily:"'DM Sans',sans-serif" }}
                onKeyDown={e => {
                  if (e.key === "Enter" && addTermino.trim() && addDef.trim()) {
                    setGlosario([...glosario, { id:"custom_"+Date.now(), termino:addTermino.trim(), definicion:addDef.trim(), incluir:true }]);
                    setAddTermino(""); setAddDef("");
                  }
                }} />
            </div>
            <button onClick={() => {
              if (!addTermino.trim() || !addDef.trim()) return;
              setGlosario([...glosario, { id:"custom_"+Date.now(), termino:addTermino.trim(), definicion:addDef.trim(), incluir:true }]);
              setAddTermino(""); setAddDef("");
            }} style={{
              padding:"7px 14px", background:C.ink, color:"#fff", border:"none", borderRadius:3,
              fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
            }}>+ Añadir</button>
          </div>
        </div>
      )}

      {/* Términos y condiciones */}
      {config.incluirTerminos && (
        <div style={S.card}>
          <p style={S.sTitle}>Términos y condiciones</p>
          <textarea value={config.terminosCondiciones || ""} onChange={e => setConfig("terminosCondiciones", e.target.value)}
            rows={6} placeholder="Escribe aquí los términos y condiciones de la propuesta..."
            style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:4, padding:"10px 12px",
              fontSize:12, fontFamily:"'DM Sans',sans-serif", lineHeight:1.6, resize:"vertical", color:C.ink }} />
        </div>
      )}

      {/* Preview summary */}
      <div style={{ background:"#F5F4F1", borderRadius:8, padding:"16px 20px", border:`1px solid ${C.border}` }}>
        <p style={{ ...S.sTitle, marginBottom:10 }}>Resumen de la propuesta</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 20px", fontSize:11 }}>
          {config.incluirAlcance && servicio && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> Alcance: {servicio.alcances?.length || 0} puntos
            </div>
          )}
          {config.incluirEntregables && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> {entregablesActivos.length} entregables
            </div>
          )}
          {config.incluirCronograma && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> Cronograma: {Math.ceil(totalHoras/8)} días
            </div>
          )}
          {config.incluirOrganigrama && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> Organigrama del equipo
            </div>
          )}
          {config.incluirGlosario && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> Glosario: {glosario.filter(g=>g.incluir).length} términos
            </div>
          )}
          {config.incluirTerminos && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> Términos y condiciones
            </div>
          )}
          {config.incluirCondicionesPago && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#2E7D32" }}>✓</span> Condiciones de pago
            </div>
          )}
          {config.incluirDesglosePrecio && (
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ color:"#E65100" }}>⚠</span> Desglose de precios visible
            </div>
          )}
        </div>
      </div>
    </div>
  );
}'''

    c = c[:tent_start] + new_tent + c[tent_end:]
    changes += 1
    print("  ✓ TEnt (Entrega cliente) replaced with configurable version")
else:
    print("  ✗ TEnt function not found")


# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
with open(p, "w") as f: f.write(c)
print(f"\n{'='*50}")
print(f"  {changes} changes applied")
print(f"{'='*50}")
