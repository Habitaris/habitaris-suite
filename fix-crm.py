import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. CLEAN SIDEBAR — remove proveedores, formularios, encuestas, settings
# ═══════════════════════════════════════════════════════════════
old_nav = '''const NAV = [
  { id: "dashboard",    lbl: "Dashboard",      en: "Dashboard",      I: LayoutDashboard },
  { id: "offers",       lbl: "Ofertas",         en: "Offers",         I: FileText },
  { id: "clientes",     lbl: "Clientes",        en: "Clients",        I: User },
  { id: "proveedores",  lbl: "Proveedores",     en: "Suppliers",      I: HardHat },
  { id: "formularios",  lbl: "Formularios",     en: "Forms",          I: ClipboardList },
  { id: "encuestas",    lbl: "Encuestas ISO",   en: "ISO Surveys",    I: ClipboardCheck },
  { id: "settings",     lbl: "Configuración",   en: "Settings",       I: Settings },
];'''

new_nav = '''const NAV = [
  { id: "dashboard",    lbl: "Dashboard",      en: "Dashboard",      I: LayoutDashboard },
  { id: "offers",       lbl: "Ofertas",         en: "Offers",         I: FileText },
  { id: "clientes",     lbl: "Clientes",        en: "Clients",        I: User },
  { id: "formularios",  lbl: "Briefings",       en: "Briefings",      I: ClipboardList },
];'''

if old_nav in c:
    c = c.replace(old_nav, new_nav)
    changes += 1
    print("  ✓ Sidebar cleaned (removed proveedores, encuestas, settings)")
else:
    print("  ✗ Sidebar NAV not found")

# ═══════════════════════════════════════════════════════════════
# 2. ADD BRIEFING TAB in offer form
# ═══════════════════════════════════════════════════════════════
old_tabs = '''const TABS = [
  { id: "general",    lbl: "General",          en: "General" },
  { id: "params",     lbl: "Parámetros",       en: "Parameters" },
  { id: "borrador",   lbl: "Borrador + APU",   en: "Draft + APU" },
  { id: "cronograma", lbl: "Cronograma",       en: "Schedule" },
  { id: "flujo",      lbl: "Flujo de caja",    en: "Cash Flow" },
  { id: "organigrama",lbl: "Organigrama",      en: "Org Chart" },
  { id: "gg",         lbl: "Gastos generales",  en: "Overhead" },
  { id: "insumos",    lbl: "Insumos",          en: "Supplies" },
  { id: "equipos",    lbl: "Equipos trabajo",  en: "Work Teams" },
  { id: "resumen",    lbl: "Resumen",           en: "Summary" },
  { id: "entrega",    lbl: "Entrega cliente",   en: "Client Delivery" },
];'''

new_tabs = '''const TABS = [
  { id: "briefing",   lbl: "Briefing",         en: "Briefing" },
  { id: "general",    lbl: "General",          en: "General" },
  { id: "params",     lbl: "Parámetros",       en: "Parameters" },
  { id: "borrador",   lbl: "Borrador + APU",   en: "Draft + APU" },
  { id: "cronograma", lbl: "Cronograma",       en: "Schedule" },
  { id: "flujo",      lbl: "Flujo de caja",    en: "Cash Flow" },
  { id: "organigrama",lbl: "Organigrama",      en: "Org Chart" },
  { id: "gg",         lbl: "Gastos generales",  en: "Overhead" },
  { id: "insumos",    lbl: "Insumos",          en: "Supplies" },
  { id: "equipos",    lbl: "Equipos trabajo",  en: "Work Teams" },
  { id: "resumen",    lbl: "Resumen",           en: "Summary" },
  { id: "entrega",    lbl: "Entrega cliente",   en: "Client Delivery" },
];'''

if old_tabs in c:
    c = c.replace(old_tabs, new_tabs)
    changes += 1
    print("  ✓ Briefing tab added to offer form")
else:
    print("  ✗ Offer TABS not found")

# ═══════════════════════════════════════════════════════════════
# 3. ADD BRIEFING TAB RENDER + COMPONENT
# Find where tabs render and add briefing tab
# ═══════════════════════════════════════════════════════════════
old_render = '      {tab === "general"    && <TGen d={d} set={set} offers={offers} />}'
new_render = '''      {tab === "briefing"   && <TBriefing d={d} set={set} />}
      {tab === "general"    && <TGen d={d} set={set} offers={offers} />}'''

if old_render in c:
    c = c.replace(old_render, new_render)
    changes += 1
    print("  ✓ Briefing tab render added")
else:
    print("  ✗ Tab render line not found")

# ═══════════════════════════════════════════════════════════════
# 4. ADD TBriefing COMPONENT before the Form function
# ═══════════════════════════════════════════════════════════════
briefing_component = '''
/* ─── BRIEFING TAB — Informe de respuestas ────────────────────── */
function TBriefing({ d, set }) {
  const [briefingData, setBriefingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (d.briefingId) {
      try {
        const raw = store.getSync("hab:briefing:" + d.briefingId);
        if (raw) setBriefingData(JSON.parse(raw));
      } catch {}
    }
    setLoading(false);
  }, [d.briefingId]);

  const CAMPOS = BRIEFING_CAMPOS;
  const S = { label: { fontSize:9, letterSpacing:1.5, textTransform:"uppercase", color:C.inkLight, margin:"0 0 4px", fontWeight:600 },
              val: { fontSize:13, color:C.ink, margin:"0 0 12px", lineHeight:1.5 },
              card: { background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"20px 24px", marginBottom:16 },
              grid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" } };

  if (loading) return <div style={{ padding:40, textAlign:"center", color:C.inkLight }}>Cargando...</div>;

  if (!d.briefingId) return (
    <div style={{ padding:"60px 0", textAlign:"center" }}>
      <p style={{ fontSize:14, color:C.inkLight, margin:"0 0 12px" }}>Esta oferta no tiene un briefing vinculado.</p>
      <p style={{ fontSize:12, color:C.inkLight }}>Puedes crear una oferta desde un briefing en Briefings → Recibidos → "Crear oferta"</p>
    </div>
  );

  if (!briefingData) return (
    <div style={{ padding:"60px 0", textAlign:"center" }}>
      <p style={{ fontSize:14, color:C.inkLight }}>Briefing vinculado (ID: {d.briefingId}) pero los datos no se encontraron en la base de datos.</p>
    </div>
  );

  // Group fields by section
  const sections = [
    { title: "Identificación del proyecto", icon: "📋", keys: ["nombre","email","telefono","como_conociste","ciudad","edificio","direccion_proyecto","tipo_proyecto","area_m2","num_habitaciones"] },
    { title: "Diseño y estilo", icon: "🎨", keys: ["estilo","colores_materiales","espacios","fecha_inicio","plazo"] },
    { title: "Presupuesto y financiación", icon: "💰", keys: ["presupuesto","financiacion","lo_mas_importante","que_esperas","links_ref"] },
    { title: "Datos de facturación", icon: "🧾", keys: ["razon_social","documento","email_factura","dir_facturacion","retenciones","detalle_retenciones","anticipo","forma_pago"] },
  ];

  return (
    <div className="fade">
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <span style={{ fontSize:18 }}>📋</span>
          <h3 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:18, fontWeight:700, margin:0, color:C.ink }}>Informe de Briefing</h3>
        </div>
        <p style={{ fontSize:11, color:C.inkLight, margin:"4px 0 0" }}>
          Respuestas del cliente · {briefingData.fecha || "—"} · {briefingData.nombre || "Sin nombre"}
        </p>
      </div>

      {sections.map((sec, si) => {
        const hasData = sec.keys.some(k => {
          const v = briefingData[k];
          return v && (Array.isArray(v) ? v.length > 0 : String(v).trim() !== "");
        });
        if (!hasData) return null;
        return (
          <div key={si} style={S.card}>
            <h4 style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:700, margin:"0 0 16px", color:C.ink, display:"flex", alignItems:"center", gap:8 }}>
              <span>{sec.icon}</span> {sec.title}
            </h4>
            <div style={S.grid}>
              {sec.keys.map(k => {
                const v = briefingData[k];
                if (!v || (Array.isArray(v) && v.length === 0) || String(v).trim() === "") return null;
                const campo = CAMPOS.find(c => c.key === k);
                const label = campo?.lbl || k;
                const display = Array.isArray(v) ? v.join(", ") : String(v);
                return (
                  <div key={k}>
                    <p style={S.label}>{label}</p>
                    <p style={S.val}>{display}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'''

# Insert before "/* ─── FORM ───" line
anchor = '/* ─── FORM ───────────────────────────────────────────────────── */'
if anchor in c:
    c = c.replace(anchor, briefing_component + anchor)
    changes += 1
    print("  ✓ TBriefing component added")
else:
    print("  ✗ FORM anchor not found")

# ═══════════════════════════════════════════════════════════════
# 5. IMPROVE CLIENT: add billing fields to briefingToClient
# ═══════════════════════════════════════════════════════════════
old_client = '''    emailFactura:   b.email_factura || b.email || "",
    dirFacturacion: b.dir_facturacion || "",
    briefingId:     b.id,
    fechaAlta:      new Date().toISOString().split("T")[0],
  };
}'''

new_client = '''    emailFactura:   b.email_factura || b.email || "",
    dirFacturacion: b.dir_facturacion || "",
    razonSocial:    b.razon_social || "",
    retenciones:    b.retenciones || "",
    detalleRet:     b.detalle_retenciones || "",
    formaPago:      b.forma_pago || "",
    anticipo:       b.anticipo || "",
    direccion:      b.direccion_proyecto || "",
    briefingId:     b.id,
    fechaAlta:      new Date().toISOString().split("T")[0],
  };
}'''

if old_client in c:
    c = c.replace(old_client, new_client)
    changes += 1
    print("  ✓ Client billing fields enriched")
else:
    print("  ✗ Client billing pattern not found")

# ═══════════════════════════════════════════════════════════════
# 6. FIX PHONE: cliente teléfono not mapping correctly
# ═══════════════════════════════════════════════════════════════
old_phone = "    telMovil: b.telefono || \"\","
new_phone = "    telMovil: (b.telefono || \"\").replace(/^\\+57\\s*/, \"\"),"
if old_phone in c:
    c = c.replace(old_phone, new_phone)
    changes += 1
    print("  ✓ Phone mapping fixed")

# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
with open(p, "w") as f: f.write(c)
print(f"\n{'='*50}")
print(f"  {changes} changes applied")
print(f"{'='*50}")
