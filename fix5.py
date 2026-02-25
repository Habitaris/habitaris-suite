import os, re
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# 1. REPLACE PDF function with premium design
# Find the entire PDF button block and replace it
old_pdf = '''            <Btn icon={FileText} v="sec" on={() => {
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
            }}>PDF / Imprimir</Btn>'''

new_pdf = r'''            <Btn icon={FileText} v="sec" on={() => {
              const tel = (form.telMovil||"").replace(/^\+57\s*/,"");
              const w = window.open("","_blank");
              w.document.write(`<html><head><title>${form.nombre} — Habitaris</title>
              <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
              <style>
                * { margin:0; padding:0; box-sizing:border-box; }
                @page { size:A4; margin:0; }
                body { font-family:'DM Sans',sans-serif; color:#1a1a1a; background:#fff; }
                .page { width:210mm; min-height:297mm; margin:0 auto; position:relative; }
                /* Header bar */
                .header { background:#1a1a1a; color:#fff; padding:32px 40px; display:flex; justify-content:space-between; align-items:flex-start; }
                .logo-area { display:flex; align-items:center; gap:14px; }
                .logo-mark { width:36px; height:36px; border:2px solid #fff; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px; }
                .logo-text { font-size:15px; font-weight:700; letter-spacing:5px; text-transform:uppercase; }
                .logo-sub { font-size:8px; letter-spacing:3px; color:rgba(255,255,255,0.4); text-transform:uppercase; margin-top:2px; }
                .doc-type { text-align:right; }
                .doc-type h1 { font-size:11px; letter-spacing:3px; text-transform:uppercase; font-weight:600; color:rgba(255,255,255,0.5); }
                .doc-type .name { font-size:20px; font-weight:700; margin-top:4px; letter-spacing:-0.3px; }
                /* Content */
                .content { padding:32px 40px; }
                .section { margin-bottom:28px; }
                .section-title { font-size:9px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#999; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid #e8e6e3; }
                .grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px 28px; }
                .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:4px 28px; }
                .field { margin-bottom:14px; }
                .field-label { font-size:7.5px; font-weight:600; letter-spacing:1.8px; text-transform:uppercase; color:#b0a99f; margin-bottom:3px; }
                .field-value { font-size:12px; font-weight:500; color:#1a1a1a; line-height:1.4; }
                .field-value.empty { color:#d4d0cb; font-style:italic; font-weight:400; }
                /* Badge */
                .badge { display:inline-block; padding:3px 10px; background:#f4f3f1; border-radius:3px; font-size:10px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#666; }
                /* Notes */
                .notes-box { background:#faf9f7; border:1px solid #ece9e4; border-radius:6px; padding:16px 20px; font-size:11px; line-height:1.7; color:#555; white-space:pre-wrap; }
                /* Footer */
                .footer { position:absolute; bottom:0; left:0; right:0; padding:16px 40px; display:flex; justify-content:space-between; border-top:1px solid #ece9e4; }
                .footer span { font-size:7px; letter-spacing:1.5px; text-transform:uppercase; color:#ccc; }
                /* Accent line */
                .accent-line { height:3px; background:linear-gradient(90deg, #c9a96e 0%, #e8dcc8 100%); }
                @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } .page { width:100%; min-height:auto; } }
              </style></head><body>
              <div class="page">
                <div class="header">
                  <div class="logo-area">
                    <div class="logo-mark">H</div>
                    <div><div class="logo-text">Habitaris</div><div class="logo-sub">Arquitectura &middot; Interiorismo</div></div>
                  </div>
                  <div class="doc-type">
                    <h1>Ficha de cliente</h1>
                    <div class="name">${form.nombre||""}</div>
                  </div>
                </div>
                <div class="accent-line"></div>
                <div class="content">
                  <div class="section">
                    <div class="section-title">Informaci&oacute;n general</div>
                    <div class="grid">
                      <div class="field"><div class="field-label">Nombre / Raz&oacute;n social</div><div class="field-value">${form.nombre||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Tipo de cliente</div><div class="field-value"><span class="badge">${form.tipo||"—"}</span></div></div>
                      <div class="field"><div class="field-label">NIT / CIF / DNI</div><div class="field-value">${form.nit||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Email</div><div class="field-value">${form.email||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Tel&eacute;fono m&oacute;vil</div><div class="field-value">${tel ? (form.prefijoMovil||"+57")+" "+tel : '<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Tel&eacute;fono fijo</div><div class="field-value">${form.telFijo||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Ciudad</div><div class="field-value">${form.ciudad||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Pa&iacute;s</div><div class="field-value">${form.pais||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Direcci&oacute;n</div><div class="field-value">${form.direccion||'<span class="empty">&mdash;</span>'}</div></div>
                    </div>
                  </div>
                  <div class="section">
                    <div class="section-title">Datos de facturaci&oacute;n</div>
                    <div class="grid">
                      <div class="field"><div class="field-label">Raz&oacute;n social</div><div class="field-value">${form.razonSocial||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Email facturaci&oacute;n</div><div class="field-value">${form.emailFactura||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Dir. facturaci&oacute;n</div><div class="field-value">${form.dirFacturacion||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Forma de pago</div><div class="field-value">${form.formaPago||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Retenciones</div><div class="field-value">${form.retenciones||'<span class="empty">&mdash;</span>'}</div></div>
                      <div class="field"><div class="field-label">Detalle retenciones</div><div class="field-value">${form.detalleRet||'<span class="empty">&mdash;</span>'}</div></div>
                    </div>
                  </div>
                  ${form.notas ? `<div class="section"><div class="section-title">Notas</div><div class="notes-box">${form.notas}</div></div>` : ""}
                </div>
                <div class="footer">
                  <span>Habitaris Suite &middot; CRM</span>
                  <span>Generado ${new Date().toLocaleDateString("es-CO")}</span>
                  <span>Confidencial</span>
                </div>
              </div>
              </body></html>`);
              w.document.close(); setTimeout(()=>w.print(), 300);
            }}>PDF / Imprimir</Btn>'''

if old_pdf in c:
    c = c.replace(old_pdf, new_pdf)
    print("  ✓ Premium PDF design applied")
else:
    print("  ✗ PDF pattern not found")

# 2. ADD "Refresh from briefing" — auto-fill existing client from linked briefing
old_save_btn = '''            <Btn icon={Check} on={() => {
              if (!form.nombre) { alert("El nombre es obligatorio"); return; }
              const exists = clientes.find(c=>c.id===form.id);'''

new_save_btn = '''            {form.briefingId && <Btn v="sec" on={() => {
              try {
                const raw = store.getSync("hab:briefing:" + form.briefingId);
                if (!raw) { alert("No se encontraron datos del briefing vinculado"); return; }
                const b = JSON.parse(raw);
                setForm(f => ({
                  ...f,
                  email: b.email || f.email,
                  telMovil: (b.telefono||"").replace(/^\+57\s*/, "") || f.telMovil,
                  ciudad: b.ciudad || f.ciudad,
                  direccion: b.direccion_proyecto || f.direccion,
                  razonSocial: b.razon_social || f.razonSocial,
                  emailFactura: b.email_factura || b.email || f.emailFactura,
                  dirFacturacion: b.dir_facturacion || f.dirFacturacion,
                  formaPago: b.forma_pago || f.formaPago,
                  retenciones: b.retenciones || f.retenciones,
                  detalleRet: b.detalle_retenciones || f.detalleRet,
                  nit: b.documento || f.nit,
                }));
                alert("Datos actualizados desde briefing");
              } catch { alert("Error leyendo briefing"); }
            }}>Actualizar desde briefing</Btn>}
            <Btn icon={Check} on={() => {
              if (!form.nombre) { alert("El nombre es obligatorio"); return; }
              const exists = clientes.find(c=>c.id===form.id);'''

if old_save_btn in c:
    c = c.replace(old_save_btn, new_save_btn)
    print("  ✓ 'Refresh from briefing' button added")
else:
    print("  ✗ Save button pattern not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
