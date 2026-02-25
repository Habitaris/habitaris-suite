import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════════
# 1. ADD glosario state variables alongside existing toggles
# ═══════════════════════════════════════════════════════════════
old_toggles_state = '''  const [inclCrono, setInclCrono] = useState(d.ent_inclCrono ?? false);
  const [inclOrganigrama, setInclOrganigrama] = useState(d.ent_inclOrganigrama ?? false);'''

new_toggles_state = '''  const [inclCrono, setInclCrono] = useState(d.ent_inclCrono ?? false);
  const [inclOrganigrama, setInclOrganigrama] = useState(d.ent_inclOrganigrama ?? false);
  const [inclGlosario, setInclGlosario] = useState(d.ent_inclGlosario ?? true);
  const [glosarioOpen, setGlosarioOpen] = useState(false);
  const glosario = d.glosarioOferta || [];
  const setGlosario = (g) => set("glosarioOferta", g);
  const [addTermino, setAddTermino] = useState("");
  const [addDef, setAddDef] = useState("");

  // Init glosario from predefined if empty
  useEffect(() => {
    if (glosario.length === 0 && typeof GLOSARIO_PREDEFINIDO !== "undefined") {
      setGlosario(GLOSARIO_PREDEFINIDO.map(g => ({ ...g, incluir: true })));
    }
  }, []);'''

if old_toggles_state in c:
    c = c.replace(old_toggles_state, new_toggles_state)
    changes += 1
    print("  ✓ Glosario state variables added")
else:
    print("  ✗ Toggle state block not found")

# ═══════════════════════════════════════════════════════════════
# 2. ADD glosario toggle in toolbar toggles area
# ═══════════════════════════════════════════════════════════════
old_garantias_toggle = '''              <span style={{ fontWeight:d.ent_inclGarantias?600:400, color:d.ent_inclGarantias?"#111111":C.inkMid }}>🛡️ Garantías</span>
            </label>
          </div>'''

new_garantias_toggle = '''              <span style={{ fontWeight:d.ent_inclGarantias?600:400, color:d.ent_inclGarantias?"#111111":C.inkMid }}>🛡️ Garantías</span>
            </label>
            <label style={{ display:"flex", alignItems:"center", gap:6, cursor:"pointer", fontSize:11,
              padding:"5px 10px", borderRadius:4, background:inclGlosario?"#E8F4EE":"#F5F4F1",
              border:`1px solid ${inclGlosario?"#111111":"transparent"}` }}>
              <input type="checkbox" checked={inclGlosario} onChange={e => { setInclGlosario(e.target.checked); set("ent_inclGlosario", e.target.checked); }}
                style={{ accentColor:"#111111" }} />
              <span style={{ fontWeight:inclGlosario?600:400, color:inclGlosario?"#111111":C.inkMid }}>📖 Glosario</span>
            </label>
            {inclGlosario && (
              <button onClick={() => setGlosarioOpen(!glosarioOpen)} style={{
                padding:"5px 10px", fontSize:10, fontWeight:600, cursor:"pointer",
                border:"1px solid #E0E0E0", borderRadius:4, background:glosarioOpen?"#111":"#fff",
                color:glosarioOpen?"#fff":"#555", fontFamily:"'DM Sans',sans-serif",
              }}>{glosarioOpen ? "▲ Cerrar glosario" : `▼ Editar glosario (${glosario.filter(g=>g.incluir).length})`}</button>
            )}
          </div>'''

if old_garantias_toggle in c:
    c = c.replace(old_garantias_toggle, new_garantias_toggle)
    changes += 1
    print("  ✓ Glosario toggle added to toolbar")
else:
    print("  ✗ Garantías toggle end not found")

# ═══════════════════════════════════════════════════════════════
# 3. ADD glosario editor panel after toolbar toggles section
# Find the end of the toolbar Card and add glosario editor
# ═══════════════════════════════════════════════════════════════
# The toolbar section ends with </Card> before the print content starts
# Let's find the pattern after the toolbar closes

old_toolbar_end = '''      {/* ═══════════ COVER PAGE (print only) ═══════════ */}'''

new_toolbar_end = '''      {/* ═══════════ GLOSARIO EDITOR (no-print) ═══════════ */}
      {inclGlosario && glosarioOpen && (
        <Card className="no-print" style={{ marginBottom:16 }}>
          <div style={{ padding:"14px 20px" }}>
            <div style={{ fontSize:9, fontWeight:700, color:"#888", textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>Glosario de términos</div>
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
                      {typeof GLOSARIO_PREDEFINIDO !== "undefined" && !GLOSARIO_PREDEFINIDO.find(p => p.id === g.id) && (
                        <button onClick={() => setGlosario(glosario.filter(x => x.id !== g.id))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#C44", fontSize:12 }}>×</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
        </Card>
      )}

      {/* ═══════════ COVER PAGE (print only) ═══════════ */}'''

if old_toolbar_end in c:
    c = c.replace(old_toolbar_end, new_toolbar_end)
    changes += 1
    print("  ✓ Glosario editor panel added")
else:
    print("  ✗ Cover page anchor not found")

# ═══════════════════════════════════════════════════════════════
# 4. ADD glosario section to PDF preview (printEntregaPreview)
# Insert glosario before the firma section in the PDF
# ═══════════════════════════════════════════════════════════════
old_firma_pdf = '''    // ── FIRMA ──
    html += `<div class="page">${hdr}`;
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Firma de aceptación</div>`;'''

new_firma_pdf = '''    // ── GLOSARIO ──
    if (inclGlosario && glosario.filter(g=>g.incluir).length > 0) {
      html += `<div class="page">${hdr}`;
      secNum++;
      html += `<div class="section-title"><span class="section-num">${secNum}.</span>Glosario de términos</div>`;
      html += `<table><thead><tr><th>Término</th><th>Definición</th></tr></thead><tbody>`;
      glosario.filter(g=>g.incluir).forEach(g => {
        html += `<tr><td class="bold" style="width:25%;vertical-align:top">${g.termino}</td><td>${g.definicion}</td></tr>`;
      });
      html += `</tbody></table></div>`;
    }

    // ── FIRMA ──
    html += `<div class="page">${hdr}`;
    secNum++;
    html += `<div class="section-title"><span class="section-num">${secNum}.</span>Firma de aceptación</div>`;'''

if old_firma_pdf in c:
    c = c.replace(old_firma_pdf, new_firma_pdf)
    changes += 1
    print("  ✓ Glosario added to PDF preview")
else:
    print("  ✗ Firma PDF anchor not found")

# ═══════════════════════════════════════════════════════════════
# 5. ADD glosario section to print layout (in-page render)
# Find the print firma section and add glosario before it
# ═══════════════════════════════════════════════════════════════
old_firma_print = '''      {/* ═══════════ FIRMA ═══════════ */}'''

new_firma_print = '''      {/* ═══════════ GLOSARIO (print) ═══════════ */}
      {inclGlosario && glosario.filter(g=>g.incluir).length > 0 && (
        <div className="print-only print-page-break">
          <STitle t="Glosario de términos" />
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                <th style={{ textAlign:"left", padding:"6px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase", width:"25%" }}>Término</th>
                <th style={{ textAlign:"left", padding:"6px 8px", fontSize:8, fontWeight:700, color:"#888", textTransform:"uppercase" }}>Definición</th>
              </tr>
            </thead>
            <tbody>
              {glosario.filter(g=>g.incluir).map(g => (
                <tr key={g.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:"6px 8px", fontSize:11, fontWeight:600, color:C.ink, verticalAlign:"top" }}>{g.termino}</td>
                  <td style={{ padding:"6px 8px", fontSize:11, color:C.inkMid, lineHeight:1.4 }}>{g.definicion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════ FIRMA ═══════════ */}'''

if old_firma_print in c:
    c = c.replace(old_firma_print, new_firma_print)
    changes += 1
    print("  ✓ Glosario added to print layout")
else:
    print("  ✗ Print firma section not found")

# ═══════════════════════════════════════════════════════════════
# 6. ADD glosario to table of contents (print)
# ═══════════════════════════════════════════════════════════════
old_toc_firma = '''secs.push("Firma de aceptación");'''

new_toc_firma = '''if (inclGlosario && glosario.filter(g=>g.incluir).length > 0) secs.push("Glosario de términos");
    secs.push("Firma de aceptación");'''

if old_toc_firma in c:
    c = c.replace(old_toc_firma, new_toc_firma)
    changes += 1
    print("  ✓ Glosario added to table of contents")
else:
    print("  ✗ TOC firma anchor not found")


# ═══════════════════════════════════════════════════════════════
# WRITE
# ═══════════════════════════════════════════════════════════════
with open(p, "w") as f: f.write(c)
print(f"\n{'='*50}")
print(f"  {changes} changes applied")
print(f"{'='*50}")
