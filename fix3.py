import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# 1. ADD BILLING FIELDS to client form — after País select, before Notas
old_form = '''            <div style={{ gridColumn:"2 / -1" }}>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
              <textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}
                rows={2} style={{ ...inp(), resize:"vertical" }}/>
            </div>'''

new_form = '''            <FI lbl="Dirección" val={form.direccion||""} on={e=>setForm(f=>({...f,direccion:e.target.value}))} />
          </div>
          <div style={{ marginTop:16, padding:"16px 0", borderTop:`1px solid ${C.border}` }}>
            <p style={{ fontSize:10, fontWeight:700, color:C.inkLight, letterSpacing:1.5, textTransform:"uppercase", margin:"0 0 12px" }}>Datos de facturación</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <FI lbl="Razón social" val={form.razonSocial||""} on={e=>setForm(f=>({...f,razonSocial:e.target.value}))} />
              <FI lbl="Email facturación" val={form.emailFactura||""} on={e=>setForm(f=>({...f,emailFactura:e.target.value}))} />
              <FI lbl="Dir. facturación" val={form.dirFacturacion||""} on={e=>setForm(f=>({...f,dirFacturacion:e.target.value}))} />
              <FI lbl="Forma de pago" val={form.formaPago||""} on={e=>setForm(f=>({...f,formaPago:e.target.value}))} />
              <FI lbl="Retenciones" val={form.retenciones||""} on={e=>setForm(f=>({...f,retenciones:e.target.value}))} />
              <FI lbl="Detalle retenciones" val={form.detalleRet||""} on={e=>setForm(f=>({...f,detalleRet:e.target.value}))} />
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:12 }}>
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={{ display:"block", fontSize:10, fontWeight:600, color:C.inkLight, marginBottom:5, textTransform:"uppercase", letterSpacing:1 }}>Notas</label>
              <textarea value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))}
                rows={2} style={{ ...inp(), resize:"vertical" }}/>
            </div>'''

if old_form in c:
    c = c.replace(old_form, new_form)
    print("  ✓ Billing fields added to client form")
else:
    print("  ✗ Client form pattern not found")

# 2. FIX phone display in client card — "+57 +57" bug
# The issue is telMovil contains "+57" from bad data
old_phone_display = '{(c.telMovil||c.tel) && <span>📱 {c.prefijoMovil||"+57"} {c.telMovil||c.tel}</span>}'
new_phone_display = '{(c.telMovil||c.tel) && <span>📱 {c.prefijoMovil||"+57"} {(c.telMovil||c.tel||"").replace(/^\\+57\\s*/, "")}</span>}'

if old_phone_display in c:
    c = c.replace(old_phone_display, new_phone_display)
    print("  ✓ Phone display fixed (strips duplicate +57)")
else:
    print("  ✗ Phone display pattern not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
