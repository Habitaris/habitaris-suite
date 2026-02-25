import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# 1. CLEAN phone data on load — strip "+57" from telMovil and fix NaN in notas
old_load = '''    (() => { try { const r = store.getSync(SKEY); if(r) setClientes(JSON.parse(r)||[]); } catch{} })();'''
new_load = '''    (() => { try { const r = store.getSync(SKEY); if(r) {
      const list = (JSON.parse(r)||[]).map(cl => ({
        ...cl,
        telMovil: (cl.telMovil||cl.tel||"").replace(/^\\+57\\s*/, ""),
        notas: (cl.notas||"").replace(/Presupuesto: NaN/g, "Presupuesto: —"),
      }));
      setClientes(list);
    }} catch{} })();'''

if old_load in c:
    c = c.replace(old_load, new_load)
    print("  ✓ Phone cleanup on load added")
else:
    print("  ✗ Load pattern not found")

# 2. ADD PDF EXPORT BUTTON next to "+ Nuevo cliente"
old_header = '''<h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Clientes</h1>
          <p style={{ fontSize:12, color:C.inkLight, margin:"3px 0 0" }}>{clientes.length} registros</p></div>'''

new_header = '''<h1 style={{ fontSize:22, fontWeight:700, margin:0 }}>Clientes</h1>
          <p style={{ fontSize:12, color:C.inkLight, margin:"3px 0 0" }}>{clientes.length} registros</p></div>'''

# 3. Add PDF print function for client card — add to form buttons
old_buttons = '''            <Btn icon={Check} on={() => {
              if (!form.nombre) { alert("El nombre es obligatorio"); return; }
              const exists = clientes.find(c=>c.id===form.id);'''

new_buttons = '''            <Btn icon={FileText} v="sec" on={() => {
              const w = window.open("","_blank");
              w.document.write(`<html><head><title>Ficha Cliente - ${form.nombre}</title>
              <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                body { font-family:'DM Sans',Helvetica,Arial,sans-serif; padding:40px; color:#111; }
                .logo { font-size:18px; font-weight:800; letter-spacing:6px; text-transform:uppercase; margin-bottom:4px; }
                .sub { font-size:9px; letter-spacing:3px; color:#999; text-transform:uppercase; margin-bottom:30px; }
                h2 { font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:2px; border-bottom:1px solid #ddd; padding-bottom:6px; margin:24px 0 12px; }
                .grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px 20px; }
                .field label { font-size:8px; text-transform:uppercase; letter-spacing:1.5px; color:#888; font-weight:600; }
                .field p { font-size:12px; margin:2px 0 8px; min-height:16px; }
                .notes { margin-top:20px; padding:12px; background:#f8f7f5; border-radius:4px; font-size:11px; line-height:1.6; white-space:pre-wrap; }
                @media print { body { padding:20px; } }
              </style></head><body>
              <div class="logo">H Habitaris</div>
              <div class="sub">Ficha de Cliente</div>
              <h2>Datos generales</h2>
              <div class="grid">
                <div class="field"><label>Nombre</label><p>${form.nombre||"—"}</p></div>
                <div class="field"><label>Tipo</label><p>${form.tipo||"—"}</p></div>
                <div class="field"><label>NIT / CIF / DNI</label><p>${form.nit||"—"}</p></div>
                <div class="field"><label>Email</label><p>${form.email||"—"}</p></div>
                <div class="field"><label>Teléfono</label><p>${form.prefijoMovil||"+57"} ${(form.telMovil||"").replace(/^\\+57\\s*/,"")}</p></div>
                <div class="field"><label>Ciudad</label><p>${form.ciudad||"—"}</p></div>
                <div class="field"><label>País</label><p>${form.pais||"—"}</p></div>
                <div class="field"><label>Dirección</label><p>${form.direccion||"—"}</p></div>
              </div>
              <h2>Datos de facturación</h2>
              <div class="grid">
                <div class="field"><label>Razón social</label><p>${form.razonSocial||"—"}</p></div>
                <div class="field"><label>Email facturación</label><p>${form.emailFactura||"—"}</p></div>
                <div class="field"><label>Dir. facturación</label><p>${form.dirFacturacion||"—"}</p></div>
                <div class="field"><label>Forma de pago</label><p>${form.formaPago||"—"}</p></div>
                <div class="field"><label>Retenciones</label><p>${form.retenciones||"—"}</p></div>
                <div class="field"><label>Detalle retenciones</label><p>${form.detalleRet||"—"}</p></div>
              </div>
              ${form.notas ? '<h2>Notas</h2><div class="notes">'+form.notas+'</div>' : ''}
              <div style="margin-top:40px;font-size:8px;color:#ccc;text-align:center;">Habitaris Suite · Generado ${new Date().toLocaleDateString("es-CO")}</div>
              </body></html>`);
              w.document.close(); w.print();
            }}>PDF / Imprimir</Btn>
            <Btn icon={Check} on={() => {
              if (!form.nombre) { alert("El nombre es obligatorio"); return; }
              const exists = clientes.find(c=>c.id===form.id);'''

if old_buttons in c:
    c = c.replace(old_buttons, new_buttons)
    print("  ✓ PDF export button added to client form")
else:
    print("  ✗ Buttons pattern not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
