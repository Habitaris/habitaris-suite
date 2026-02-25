import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. ADD TEST DATA CONSTANTS for RRHH + Logística
# ═══════════════════════════════════════════════════════════════
test_data_block = '''
/* ─── DATOS DE PRUEBA RRHH + LOGÍSTICA ───────────────────────── */
const TEST_RRHH_CARGOS = [
  { id: "dir_creativo",   nombre: "Director Creativo",       salarioBruto: 8000000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "arq_senior",     nombre: "Arquitecto Senior",       salarioBruto: 5500000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "arq_junior",     nombre: "Arquitecto Junior",       salarioBruto: 3000000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "disenador_int",  nombre: "Diseñador de Interiores", salarioBruto: 4000000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "modelador_3d",   nombre: "Modelador 3D / BIM",     salarioBruto: 3500000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "dibujante",      nombre: "Dibujante Técnico",       salarioBruto: 2500000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "residente",      nombre: "Residente de Obra",       salarioBruto: 4200000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
  { id: "aux_admin",      nombre: "Auxiliar Administrativo",  salarioBruto: 1800000, prestaciones: 52.18, segSocial: 12.5, parafiscales: 9, activo: true },
];

const TEST_RRHH_ACTIVOS = [
  { id: "macbook_pro",  nombre: "MacBook Pro 14\\"",    valorCompra: 12000000, vidaUtilAnios: 5, usoAnual: 1760, activo: true },
  { id: "monitor_4k",   nombre: "Monitor 4K 27\\"",     valorCompra: 2500000,  vidaUtilAnios: 5, usoAnual: 1760, activo: true },
  { id: "ipad_pro",     nombre: "iPad Pro + Pencil",    valorCompra: 5000000,  vidaUtilAnios: 4, usoAnual: 1760, activo: true },
  { id: "impresora_a3", nombre: "Plotter / Impresora A3", valorCompra: 8000000, vidaUtilAnios: 7, usoAnual: 1760, activo: true },
  { id: "disco_ext",    nombre: "Disco SSD externo 2TB", valorCompra: 600000,  vidaUtilAnios: 4, usoAnual: 1760, activo: true },
];

const TEST_RRHH_LICENCIAS = [
  { id: "autocad",       nombre: "AutoCAD",              costoAnual: 3600000,  activo: true },
  { id: "revit",         nombre: "Revit",                costoAnual: 4800000,  activo: true },
  { id: "sketchup_pro",  nombre: "SketchUp Pro",         costoAnual: 1200000,  activo: true },
  { id: "adobe_suite",   nombre: "Adobe Creative Suite", costoAnual: 1800000,  activo: true },
  { id: "lumion",        nombre: "Lumion",                costoAnual: 7200000,  activo: true },
  { id: "enscape",       nombre: "Enscape",              costoAnual: 2400000,  activo: true },
  { id: "office365",     nombre: "Microsoft 365",        costoAnual: 480000,   activo: true },
  { id: "canva_pro",     nombre: "Canva Pro",            costoAnual: 360000,   activo: true },
];

const TEST_RRHH_JORNADA = {
  hDia: 8, diasSemana: 5, semanasAnio: 50, pctProductivas: 75, diasFestivos: 18, diasAusencias: 5
};

const TEST_LOGISTICA_ITEMS = [
  { id: "epp_casco",     nombre: "Casco de seguridad",     familia: "epp",      precio: 45000,  vidaUtil: 12, activo: true, asociadoACargo: true, cargosAsociados: ["residente"] },
  { id: "epp_chaleco",   nombre: "Chaleco reflectivo",     familia: "epp",      precio: 25000,  vidaUtil: 6,  activo: true, asociadoACargo: true, cargosAsociados: ["residente"] },
  { id: "epp_botas",     nombre: "Botas de seguridad",     familia: "epp",      precio: 180000, vidaUtil: 12, activo: true, asociadoACargo: true, cargosAsociados: ["residente"] },
  { id: "epp_gafas",     nombre: "Gafas de seguridad",     familia: "epp",      precio: 15000,  vidaUtil: 6,  activo: true, asociadoACargo: true, cargosAsociados: ["residente"] },
  { id: "epp_guantes",   nombre: "Guantes de trabajo",     familia: "epp",      precio: 12000,  vidaUtil: 3,  activo: true, asociadoACargo: true, cargosAsociados: ["residente"] },
  { id: "dot_camisa",    nombre: "Camisa corporativa",     familia: "dotacion", precio: 85000,  vidaUtil: 12, activo: true, asociadoACargo: false, cargosAsociados: [] },
  { id: "herr_flexo",    nombre: "Flexómetro 5m",          familia: "herr_menor", precio: 35000, vidaUtil: 24, activo: true },
  { id: "herr_nivel",    nombre: "Nivel láser",            familia: "herr_menor", precio: 350000, vidaUtil: 36, activo: true },
  { id: "herr_distanc",  nombre: "Distanciómetro láser",   familia: "herr_menor", precio: 280000, vidaUtil: 36, activo: true },
];

const TEST_CUADRILLA_DISENO = {
  id: "cuad_diseno_std",
  nombre: "Equipo Diseño Estándar",
  cargos: [
    { id: "cd1", cargoId: "dir_creativo",  cantidad: 1 },
    { id: "cd2", cargoId: "arq_senior",    cantidad: 1 },
    { id: "cd3", cargoId: "modelador_3d",  cantidad: 1 },
  ],
  activosUsados: [
    { id: "ad1", activoId: "macbook_pro",  cantidad: 3 },
    { id: "ad2", activoId: "monitor_4k",   cantidad: 3 },
  ],
  licenciasUsadas: [
    { id: "ld1", licId: "autocad",     cantidad: 2 },
    { id: "ld2", licId: "sketchup_pro", cantidad: 1 },
    { id: "ld3", licId: "lumion",      cantidad: 1 },
    { id: "ld4", licId: "adobe_suite", cantidad: 3 },
  ],
  logItemsUsados: [],
  rendimiento: 1,
  notas: "Cuadrilla estándar para proyectos de diseño arquitectónico e interiores.",
};

const TEST_CUADRILLA_OBRA = {
  id: "cuad_obra_std",
  nombre: "Equipo Supervisión Obra",
  cargos: [
    { id: "co1", cargoId: "residente",   cantidad: 1 },
    { id: "co2", cargoId: "aux_admin",   cantidad: 1 },
  ],
  activosUsados: [
    { id: "ao1", activoId: "macbook_pro", cantidad: 1 },
    { id: "ao2", activoId: "ipad_pro",    cantidad: 1 },
  ],
  licenciasUsadas: [
    { id: "lo1", licId: "office365",   cantidad: 2 },
  ],
  logItemsUsados: [
    { id: "lio1", itemId: "herr_flexo",    cantidad: 1 },
    { id: "lio2", itemId: "herr_nivel",    cantidad: 1 },
    { id: "lio3", itemId: "herr_distanc",  cantidad: 1 },
  ],
  rendimiento: 1,
  notas: "Cuadrilla estándar para supervisión y dirección de obra.",
};

const seedTestData = async () => {
  try {
    await Promise.all([
      window.storage?.set?.("hab:rrhh:cargos",    JSON.stringify(TEST_RRHH_CARGOS)),
      window.storage?.set?.("hab:rrhh:activos",    JSON.stringify(TEST_RRHH_ACTIVOS)),
      window.storage?.set?.("hab:rrhh:licencias",  JSON.stringify(TEST_RRHH_LICENCIAS)),
      window.storage?.set?.("hab:rrhh:jornada",    JSON.stringify(TEST_RRHH_JORNADA)),
      window.storage?.set?.("hab:logistica:items",  JSON.stringify(TEST_LOGISTICA_ITEMS)),
      window.storage?.set?.("hab:crm:equipos",      JSON.stringify([TEST_CUADRILLA_DISENO, TEST_CUADRILLA_OBRA])),
    ]);
    return true;
  } catch(e) { console.error("Seed error:", e); return false; }
};

const clearTestData = async () => {
  try {
    await Promise.all([
      window.storage?.set?.("hab:rrhh:cargos",    JSON.stringify([])),
      window.storage?.set?.("hab:rrhh:activos",    JSON.stringify([])),
      window.storage?.set?.("hab:rrhh:licencias",  JSON.stringify([])),
      window.storage?.set?.("hab:logistica:items",  JSON.stringify([])),
      window.storage?.set?.("hab:crm:equipos",      JSON.stringify([])),
    ]);
    return true;
  } catch(e) { console.error("Clear error:", e); return false; }
};

'''

# Insert after SERVICIOS block (before TARIFAS_MO)
anchor_tarifas = 'const TARIFAS_MO = {'
if anchor_tarifas in c:
    c = c.replace(anchor_tarifas, test_data_block + anchor_tarifas)
    changes += 1
    print("  ✓ Test data constants + seed/clear functions added")
else:
    print("  ✗ TARIFAS_MO anchor not found")

# ═══════════════════════════════════════════════════════════════
# 2. ADD SEED BUTTON to TEqu component — replace the opening
# ═══════════════════════════════════════════════════════════════
# We need to add a banner with seed/clear buttons at the top of TEqu
# when no RRHH data is loaded

old_tequ_loaded = '''  const [rrhhLoaded, setRrhhLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cR, aR, lR, jR, liR] = await Promise.all([
          window.storage?.get?.("hab:rrhh:cargos"),
          window.storage?.get?.("hab:rrhh:activos"),
          window.storage?.get?.("hab:rrhh:licencias"),
          window.storage?.get?.("hab:rrhh:jornada"),
          window.storage?.get?.("hab:logistica:items"),
        ]);
        if (cR) setRrhhCargos(JSON.parse(cR.value) || []);
        if (aR) setRrhhActivos(JSON.parse(aR.value) || []);
        if (lR) setRrhhLicencias(JSON.parse(lR.value) || []);
        if (jR) setRrhhJornada(JSON.parse(jR.value));
        if (liR) setLogItems(JSON.parse(liR.value) || []);
      } catch {}
      setRrhhLoaded(true);
    })();
  }, []);'''

new_tequ_loaded = '''  const [rrhhLoaded, setRrhhLoaded] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

  const loadRrhhData = async () => {
    try {
      const [cR, aR, lR, jR, liR] = await Promise.all([
        window.storage?.get?.("hab:rrhh:cargos"),
        window.storage?.get?.("hab:rrhh:activos"),
        window.storage?.get?.("hab:rrhh:licencias"),
        window.storage?.get?.("hab:rrhh:jornada"),
        window.storage?.get?.("hab:logistica:items"),
      ]);
      if (cR) setRrhhCargos(JSON.parse(cR.value) || []);
      if (aR) setRrhhActivos(JSON.parse(aR.value) || []);
      if (lR) setRrhhLicencias(JSON.parse(lR.value) || []);
      if (jR) setRrhhJornada(JSON.parse(jR.value));
      if (liR) setLogItems(JSON.parse(liR.value) || []);
    } catch {}
    setRrhhLoaded(true);
  };

  useEffect(() => { loadRrhhData(); }, []);

  const handleSeedTest = async () => {
    setSeedLoading(true);
    const ok = await seedTestData();
    if (ok) { await loadRrhhData(); }
    setSeedLoading(false);
  };

  const handleClearTest = async () => {
    if (!window.confirm("¿Eliminar todos los datos de prueba de RRHH y Logística?")) return;
    setSeedLoading(true);
    const ok = await clearTestData();
    if (ok) {
      setRrhhCargos([]); setRrhhActivos([]); setRrhhLicencias([]); setLogItems([]);
      setRrhhLoaded(true);
    }
    setSeedLoading(false);
  };'''

if old_tequ_loaded in c:
    c = c.replace(old_tequ_loaded, new_tequ_loaded)
    changes += 1
    print("  ✓ TEqu seed/clear handlers added")
else:
    print("  ✗ TEqu loaded block not found")

# ═══════════════════════════════════════════════════════════════
# 3. ADD SEED BANNER UI to TEqu render — find the return statement
# ═══════════════════════════════════════════════════════════════
# We need to find the return in TEqu and add the banner before the main content
# Looking for the pattern in TEqu's return, typically after "const inp ="

# Find the existing "No se encontraron datos de RRHH" or similar fallback message
# Let's add a banner right after the return( in TEqu

# Actually let's find the PDF export function end and the render start
old_tequ_return_start = '''  // ── PDF export ──
  const printEquipos = () => {'''

new_tequ_return_start = '''  // ── Seed data banner ──
  const hasRrhhData = rrhhCargos.filter(c => c.activo !== false).length > 0;

  // ── PDF export ──
  const printEquipos = () => {'''

if old_tequ_return_start in c:
    c = c.replace(old_tequ_return_start, new_tequ_return_start)
    changes += 1
    print("  ✓ hasRrhhData flag added")
else:
    print("  ✗ printEquipos anchor not found")

# Now add the banner UI in the render — find the opening of the return JSX
# The TEqu render starts with a return ( containing the main layout
# Let's find a unique pattern near the start of TEqu's return

# Looking for the pattern where equipos are rendered
# Actually let's search for the section header in TEqu

# Let me find what's right after the return in TEqu
old_tequ_ui_start = None
# Search for the "Equipos de trabajo" heading or the first div in TEqu render
# From the code, the render likely starts with buttons to add equipo, manage biblioteca
# Let's look for "addEquipo" or the first button

# Actually, the safest approach is to add the banner as a conditional render
# right before the existing main content. Let me find the pattern.

# Let me search for a unique line in TEqu's JSX return
import re

# Find the pattern "Exportar PDF" or "printEquipos" button in TEqu render
# and add the banner before the main grid

# Alternative approach: add a new block right after the "return (" in TEqu
# TEqu starts at line ~6927. Its return statement would be somewhere after all the logic

# Let's find the TEqu render pattern - typically has add/manage buttons
tequ_render_pattern = '''        <button onClick={() => addEquipo()} style={{'''
if tequ_render_pattern in c:
    # Add banner before the add button row
    banner_block = '''        {/* ── SEED DATA BANNER ── */}
        {!hasRrhhData && rrhhLoaded && (
          <div style={{ background:"#FFF8E1", border:"1px solid #FFD54F", borderRadius:6, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ margin:"0 0 4px", fontSize:12, fontWeight:700, color:"#F57F17" }}>⚠ Sin datos de RRHH ni Logística</p>
              <p style={{ margin:0, fontSize:11, color:"#795548" }}>Los módulos de RRHH y Logística no tienen datos. Puedes cargar datos de prueba para probar el sistema de equipos.</p>
            </div>
            <button onClick={handleSeedTest} disabled={seedLoading} style={{
              padding:"8px 20px", background:"#111", color:"#fff", border:"none", borderRadius:4,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap", opacity: seedLoading ? 0.5 : 1,
            }}>{seedLoading ? "Cargando..." : "Cargar datos de prueba"}</button>
          </div>
        )}
        {hasRrhhData && (
          <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
            <button onClick={handleClearTest} disabled={seedLoading} style={{
              padding:"4px 12px", background:"none", border:"1px solid #E0E0E0", borderRadius:3,
              fontSize:9, color:"#999", cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
            }}>Limpiar datos de prueba</button>
          </div>
        )}
''' + '        <button onClick={() => addEquipo()} style={{'
    c = c.replace(tequ_render_pattern, banner_block)
    changes += 1
    print("  ✓ Seed banner UI added to TEqu render")
else:
    print("  ✗ TEqu render add button not found, trying alternate...")
    # Try finding by the return pattern
    # Let's try another approach - add after a heading
    alt_pattern = '''style={{ fontSize:16, fontWeight:800, margin:0 }}>Equipos de trabajo'''
    if alt_pattern in c:
        c = c.replace(alt_pattern, alt_pattern + ''' — {hasRrhhData ? `${rrhhCargos.length} cargos RRHH` : "sin datos RRHH"}''')
        changes += 1
        print("  ✓ (alt) RRHH status added to heading")


# ═══════════════════════════════════════════════════════════════
# 4. UPDATE TEqu cargo selector to use RRHH cargos
# ═══════════════════════════════════════════════════════════════
# The existing code already has fallback logic:
# const useFallback = rrhhCargos.filter(c => c.activo !== false).length === 0;
# const cargosList = useFallback ? catsMO.map(...) : rrhhCargos.filter(...)
# This should work with the test data since test cargos have { activo: true }

# But we need to make sure cargoId matching works. Current TEqu uses cargoId/catId
# The RRHH cargos use `id` field. Let's check if getCostoHora references correctly.
# Looking at the code: getCostoHora(cargoId) → costoHoraCargo(cargoId) → rrhhCargos.find(x => x.id === cargoId)
# And the cargos in equipos use: { cargoId: "dir_creativo" }
# So this should match with test data ✓


# ═══════════════════════════════════════════════════════════════
# 5. ADD ALCANCES → EQUIPOS CONNECTION
# Add a summary card in TEqu showing total hours from Alcances
# and calculated cost with selected team
# ═══════════════════════════════════════════════════════════════

# Find where TEqu gets d and add calculation
old_tequ_equipos = '  const equipos = d.ofertaEquipos || [];'
new_tequ_equipos = '''  // ── Connection with Alcances tab ──
  const entregablesActivos = (d.entregablesOferta || []).filter(e => e.incluir);
  const horasAlcances = entregablesActivos.reduce((s, e) => s + (e.horas || 0), 0);
  const servicioActual = typeof SERVICIOS !== "undefined" ? SERVICIOS.find(s => s.id === d.servicioId) : null;

  const equipos = d.ofertaEquipos || [];'''

if old_tequ_equipos in c:
    c = c.replace(old_tequ_equipos, new_tequ_equipos)
    changes += 1
    print("  ✓ Alcances→Equipos connection variables added")
else:
    print("  ✗ ofertaEquipos anchor not found")

# Now add the summary card in the render — after the seed banner, before equipment list
# Let's add it as part of the banner area
# We'll insert after the seed banner section

# Find a good place to add the Alcances summary
# Let's add it after the hasRrhhData clear button and before the equipment cards
alcances_summary = '''
        {/* ── ALCANCES → APU RESUMEN ── */}
        {horasAlcances > 0 && equipos.length > 0 && (
          <div style={{ background:"#F5F4F1", border:`1px solid ${C.border}`, borderRadius:6, padding:"16px 20px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <p style={{ margin:0, fontSize:9, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.inkLight }}>
                Resumen Alcances → APU
              </p>
              {servicioActual && <span style={{ fontSize:10, padding:"2px 8px", background:"#fff", border:`1px solid ${C.border}`, borderRadius:3, color:C.ink, fontWeight:600 }}>{servicioActual.nombre}</span>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12 }}>
              <div>
                <p style={{ margin:"0 0 2px", fontSize:8, color:C.inkLight, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Entregables</p>
                <p style={{ margin:0, fontSize:18, fontWeight:700, color:C.ink }}>{entregablesActivos.length}</p>
              </div>
              <div>
                <p style={{ margin:"0 0 2px", fontSize:8, color:C.inkLight, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Horas totales</p>
                <p style={{ margin:0, fontSize:18, fontWeight:700, color:C.ink }}>{horasAlcances}h</p>
              </div>
              <div>
                <p style={{ margin:"0 0 2px", fontSize:8, color:C.inkLight, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Costo/hora equipo</p>
                <p style={{ margin:0, fontSize:18, fontWeight:700, color:C.ink }}>
                  {equipos.length > 0 ? fmtN(calcCosto(equipos[0]).totalH) : "—"} <span style={{ fontSize:9, fontWeight:400, color:C.inkLight }}>{moneda}/h</span>
                </p>
              </div>
              <div>
                <p style={{ margin:"0 0 2px", fontSize:8, color:C.inkLight, fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Costo total diseño</p>
                <p style={{ margin:0, fontSize:18, fontWeight:700, color:"#2E7D32" }}>
                  {equipos.length > 0 ? fmtN(horasAlcances * calcCosto(equipos[0]).totalH) : "—"} <span style={{ fontSize:9, fontWeight:400, color:C.inkLight }}>{moneda}</span>
                </p>
              </div>
            </div>
          </div>
        )}
'''

# Find a good insertion point — after the clear button, before equipment cards
# The safest is to insert right before the first equipment card rendering
# Let's look for the "Equipos de trabajo" header or the map over equipos

# Try inserting after the seed banner, before the add button
add_equipo_pattern = '        {/* ── SEED DATA BANNER ── */}'
if add_equipo_pattern in c:
    # We just added this. Now insert the alcances summary after the clear button block
    clear_button_end = '''            }}>Limpiar datos de prueba</button>
          </div>
        )}'''
    if clear_button_end in c:
        c = c.replace(clear_button_end, clear_button_end + alcances_summary)
        changes += 1
        print("  ✓ Alcances→APU summary card added")
    else:
        print("  ✗ Clear button end not found for summary insertion")
else:
    print("  ✗ Seed banner not found for summary insertion")


# ═══════════════════════════════════════════════════════════════
# 6. ENSURE useEquiposBiblioteca reads async (fix for Supabase)
# ═══════════════════════════════════════════════════════════════
# The hook uses window.storage?.get? synchronously which may not work
# with Supabase async storage. Let's update it.

old_use_hook = '''function useEquiposBiblioteca() {
  const [equipos, setEquipos] = useState(() => {
    try {
      const s = window.storage?.get?.("hab:crm:equipos");
      const loaded = s ? JSON.parse(s.value) : null;
      return loaded?.length ? loaded : EQUIPOS_DEFAULTS;
    } catch { return EQUIPOS_DEFAULTS; }
  });
  const save = (list) => {
    setEquipos(list);
    try { window.storage?.set?.("hab:crm:equipos", JSON.stringify(list)); } catch {}
  };
  return [equipos, save];
}'''

new_use_hook = '''function useEquiposBiblioteca() {
  const [equipos, setEquipos] = useState(EQUIPOS_DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await window.storage?.get?.("hab:crm:equipos");
        const parsed = s ? JSON.parse(s.value) : null;
        if (parsed?.length) setEquipos(parsed);
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const save = async (list) => {
    setEquipos(list);
    try { await window.storage?.set?.("hab:crm:equipos", JSON.stringify(list)); } catch {}
  };
  return [equipos, save, loaded];
}'''

if old_use_hook in c:
    c = c.replace(old_use_hook, new_use_hook)
    changes += 1
    print("  ✓ useEquiposBiblioteca updated to async")
else:
    print("  ✗ useEquiposBiblioteca hook not found (may have different formatting)")


# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
with open(p, "w") as f: f.write(c)
print(f"\n{'='*50}")
print(f"  {changes} changes applied")
print(f"{'='*50}")
