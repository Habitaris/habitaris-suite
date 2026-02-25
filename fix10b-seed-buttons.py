import os, re
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. FIX useEquiposBiblioteca — make async (uses store.get)
# ═══════════════════════════════════════════════════════════════
old_hook = '''function useEquiposBiblioteca() {
  const [equipos, setEquipos] = useState(() => {
    try {
      const s = store.get("hab:crm:equipos");
      const loaded = s ? JSON.parse(s.value) : null;
      return loaded?.length ? loaded : EQUIPOS_DEFAULTS;
    } catch { return EQUIPOS_DEFAULTS; }
  });
  const save = (list) => {
    setEquipos(list);
    try { store.set("hab:crm:equipos", JSON.stringify(list)); } catch {}
  };
  return [equipos, save];
}'''

new_hook = '''function useEquiposBiblioteca() {
  const [equipos, setEquipos] = useState(EQUIPOS_DEFAULTS);
  const [bibLoaded, setBibLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = await store.get("hab:crm:equipos");
        const parsed = s ? JSON.parse(s.value) : null;
        if (parsed?.length) setEquipos(parsed);
      } catch {}
      setBibLoaded(true);
    })();
  }, []);

  const save = async (list) => {
    setEquipos(list);
    try { await store.set("hab:crm:equipos", JSON.stringify(list)); } catch {}
  };
  return [equipos, save, bibLoaded];
}'''

if old_hook in c:
    c = c.replace(old_hook, new_hook)
    changes += 1
    print("  ✓ useEquiposBiblioteca made async")
else:
    print("  ✗ useEquiposBiblioteca not found")

# ═══════════════════════════════════════════════════════════════
# 2. ADD seed/clear handlers to TEqu — after hasRrhhData line
# ═══════════════════════════════════════════════════════════════
old_hasrrhh = '''  // ── Seed data banner ──
  const hasRrhhData = rrhhCargos.filter(c => c.activo !== false).length > 0;

  // ── PDF export ──'''

new_hasrrhh = '''  // ── Seed data banner ──
  const hasRrhhData = rrhhCargos.filter(c => c.activo !== false).length > 0;
  const [seedLoading, setSeedLoading] = useState(false);

  const reloadRrhh = async () => {
    try {
      const [cR, aR, lR, jR, liR] = await Promise.all([
        store.get("hab:rrhh:cargos"), store.get("hab:rrhh:activos"),
        store.get("hab:rrhh:licencias"), store.get("hab:rrhh:jornada"),
        store.get("hab:logistica:items"),
      ]);
      if (cR) setRrhhCargos(JSON.parse(cR.value) || []);
      if (aR) setRrhhActivos(JSON.parse(aR.value) || []);
      if (lR) setRrhhLicencias(JSON.parse(lR.value) || []);
      if (jR) setRrhhJornada(JSON.parse(jR.value));
      if (liR) setLogItems(JSON.parse(liR.value) || []);
    } catch {}
  };

  const handleSeedTest = async () => {
    setSeedLoading(true);
    const ok = await seedTestData();
    if (ok) await reloadRrhh();
    setSeedLoading(false);
  };

  const handleClearTest = async () => {
    if (!window.confirm("¿Eliminar datos de prueba de RRHH y Logística?")) return;
    setSeedLoading(true);
    const ok = await clearTestData();
    if (ok) {
      setRrhhCargos([]); setRrhhActivos([]); setRrhhLicencias([]); setLogItems([]);
    }
    setSeedLoading(false);
  };

  // ── PDF export ──'''

if old_hasrrhh in c:
    c = c.replace(old_hasrrhh, new_hasrrhh)
    changes += 1
    print("  ✓ Seed/clear handlers added to TEqu")
else:
    print("  ✗ hasRrhhData block not found")

# ═══════════════════════════════════════════════════════════════
# 3. UPDATE the RRHH status Card — add seed/clear buttons
# ═══════════════════════════════════════════════════════════════
old_rrhh_card = '''      {/* RRHH data status */}
      <Card style={{ padding:"10px 14px", marginBottom:14, background: useFallback ? "#FFF8E7" : "#E6F4EC" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", fontSize:11 }}>
          {useFallback ? (
            <><span style={{ color:"#8C6A00" }}>⚠️ <strong>Sin cargos en RRHH</strong> — Usando tarifas predeterminadas.
              Crea cargos en el módulo <strong>RRHH → Cargos</strong> para que se reflejen aquí.</span></>
          ) : (
            <><span style={{ color:"#111111" }}>✅ <strong>{rrhhCargos.filter(c=>c.activo!==false).length} cargos</strong> desde RRHH ·
              <strong>{activosActivos.length} activos</strong> · <strong>{licenciasActivas.length} licencias</strong> ·
              Horas productivas/año: <strong>{Math.round(horasProdAnio)}</strong>
              {logItems.length > 0 && <> · <strong>{logItems.length} ítems</strong> desde Logística</>}
            </span></>
          )}
        </div>
      </Card>'''

new_rrhh_card = '''      {/* RRHH data status */}
      <Card style={{ padding:"10px 14px", marginBottom:14, background: useFallback ? "#FFF8E7" : "#E6F4EC" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap", fontSize:11 }}>
          <div style={{ flex:1 }}>
            {useFallback ? (
              <span style={{ color:"#8C6A00" }}>⚠️ <strong>Sin cargos en RRHH</strong> — Usando tarifas predeterminadas.
                Crea cargos en <strong>RRHH → Cargos</strong> o carga datos de prueba.</span>
            ) : (
              <span style={{ color:"#111111" }}>✅ <strong>{rrhhCargos.filter(c=>c.activo!==false).length} cargos</strong> desde RRHH ·
                <strong>{activosActivos.length} activos</strong> · <strong>{licenciasActivas.length} licencias</strong> ·
                Horas productivas/año: <strong>{Math.round(horasProdAnio)}</strong>
                {logItems.length > 0 && <> · <strong>{logItems.length} ítems</strong> desde Logística</>}
              </span>
            )}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {useFallback && (
              <button onClick={handleSeedTest} disabled={seedLoading} style={{
                padding:"5px 14px", background:"#111", color:"#fff", border:"none", borderRadius:4,
                fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                opacity: seedLoading ? 0.5 : 1, whiteSpace:"nowrap",
              }}>{seedLoading ? "Cargando..." : "⚡ Cargar datos de prueba"}</button>
            )}
            {!useFallback && (
              <button onClick={handleClearTest} disabled={seedLoading} style={{
                padding:"4px 10px", background:"none", border:"1px solid #ccc", borderRadius:3,
                fontSize:9, color:"#999", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", whiteSpace:"nowrap",
              }}>Limpiar datos prueba</button>
            )}
          </div>
        </div>
      </Card>

      {/* Alcances → APU summary */}
      {horasAlcances > 0 && equipos.length > 0 && (
        <Card style={{ padding:"14px 18px", marginBottom:14, background:"#F5F4F1" }}>
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
        </Card>
      )}'''

if old_rrhh_card in c:
    c = c.replace(old_rrhh_card, new_rrhh_card)
    changes += 1
    print("  ✓ RRHH status card updated with seed buttons + Alcances summary")
else:
    print("  ✗ RRHH status card not found")

# ═══════════════════════════════════════════════════════════════
# 4. FIX seedTestData/clearTestData to use store instead of window.storage
# ═══════════════════════════════════════════════════════════════
# The test data block we added in fix10 uses window.storage but deployed uses store
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:cargos",    JSON.stringify(TEST_RRHH_CARGOS))',
    'await store.set("hab:rrhh:cargos", JSON.stringify(TEST_RRHH_CARGOS))'
)
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:activos",    JSON.stringify(TEST_RRHH_ACTIVOS))',
    'await store.set("hab:rrhh:activos", JSON.stringify(TEST_RRHH_ACTIVOS))'
)
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:licencias",  JSON.stringify(TEST_RRHH_LICENCIAS))',
    'await store.set("hab:rrhh:licencias", JSON.stringify(TEST_RRHH_LICENCIAS))'
)
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:jornada",    JSON.stringify(TEST_RRHH_JORNADA))',
    'await store.set("hab:rrhh:jornada", JSON.stringify(TEST_RRHH_JORNADA))'
)
c = c.replace(
    'await window.storage?.set?.("hab:logistica:items",  JSON.stringify(TEST_LOGISTICA_ITEMS))',
    'await store.set("hab:logistica:items", JSON.stringify(TEST_LOGISTICA_ITEMS))'
)
c = c.replace(
    'await window.storage?.set?.("hab:crm:equipos",      JSON.stringify([TEST_CUADRILLA_DISENO, TEST_CUADRILLA_OBRA]))',
    'await store.set("hab:crm:equipos", JSON.stringify([TEST_CUADRILLA_DISENO, TEST_CUADRILLA_OBRA]))'
)

# clearTestData too
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:cargos",    JSON.stringify([]))',
    'await store.set("hab:rrhh:cargos", JSON.stringify([]))'
)
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:activos",    JSON.stringify([]))',
    'await store.set("hab:rrhh:activos", JSON.stringify([]))'
)
c = c.replace(
    'await window.storage?.set?.("hab:rrhh:licencias",  JSON.stringify([]))',
    'await store.set("hab:rrhh:licencias", JSON.stringify([]))'
)
c = c.replace(
    'await window.storage?.set?.("hab:logistica:items",  JSON.stringify([]))',
    'await store.set("hab:logistica:items", JSON.stringify([]))'
)
c = c.replace(
    'await window.storage?.set?.("hab:crm:equipos",      JSON.stringify([]))',
    'await store.set("hab:crm:equipos", JSON.stringify([]))'
)

changes += 1
print("  ✓ seedTestData/clearTestData updated to use store API")

# Also fix reloadRrhh to use store (already done above in the handler)
# And fix TEqu's useEffect if it still uses window.storage
# Check both patterns
if 'window.storage?.get?.("hab:rrhh:cargos")' in c:
    c = c.replace('window.storage?.get?.("hab:rrhh:cargos")', 'store.get("hab:rrhh:cargos")')
    c = c.replace('window.storage?.get?.("hab:rrhh:activos")', 'store.get("hab:rrhh:activos")')
    c = c.replace('window.storage?.get?.("hab:rrhh:licencias")', 'store.get("hab:rrhh:licencias")')
    c = c.replace('window.storage?.get?.("hab:rrhh:jornada")', 'store.get("hab:rrhh:jornada")')
    c = c.replace('window.storage?.get?.("hab:logistica:items")', 'store.get("hab:logistica:items")')
    changes += 1
    print("  ✓ TEqu storage calls updated to use store API")
else:
    print("  · TEqu already uses store API")


# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
with open(p, "w") as f: f.write(c)
print(f"\n{'='*50}")
print(f"  {changes} changes applied")
print(f"{'='*50}")
