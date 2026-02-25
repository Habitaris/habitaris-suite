import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# ═══════════════════════════════════════════════════════════════
# 1. COMPLETELY REPLACE the PDF button with a clean working version
# ═══════════════════════════════════════════════════════════════
# Find start and end of PDF button
pdf_start = '            <Btn icon={FileText} v="sec" on={() => {'
pdf_end = "}}>PDF / Imprimir</Btn>"

# Find the exact block
idx1 = c.find(pdf_start)
idx2 = c.find(pdf_end, idx1)
if idx1 > -1 and idx2 > -1:
    old_block = c[idx1:idx2 + len(pdf_end)]
    
    new_block = r'''            <Btn icon={FileText} v="sec" on={() => {
              const tel = (form.telMovil||"").replace(/^\+57\s*/,"");
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${form.nombre} - Habitaris</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a;background:#fff}
.page{width:100%;max-width:210mm;margin:0 auto;padding:0}
.hdr{background:#1a1a1a;padding:28px 36px;display:flex;justify-content:space-between;align-items:center}
.hdr svg{flex-shrink:0}
.hdr-right{text-align:right;color:#fff}
.hdr-right .doc{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:500}
.hdr-right .nm{font-size:18px;font-weight:600;margin-top:3px;letter-spacing:-.3px;color:#fff}
.accent{height:2px;background:linear-gradient(90deg,#c4a265,#e2d5be 60%,transparent)}
.body{padding:28px 36px 20px}
.sec{margin-bottom:22px}
.sec-t{font-size:8px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#a09890;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #eae7e2}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 24px}
.f{margin-bottom:12px}
.fl{font-size:7px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:#b5ada5;margin-bottom:2px}
.fv{font-size:11.5px;font-weight:500;color:#1a1a1a;line-height:1.3}
.fv.e{color:#d5d0ca;font-style:italic;font-weight:400}
.tag{display:inline-block;padding:2px 8px;background:#f2f0ed;border-radius:2px;font-size:9px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;color:#777}
.nbox{background:#faf9f7;border:1px solid #eceae6;border-radius:4px;padding:14px 18px;font-size:10.5px;line-height:1.7;color:#666;white-space:pre-wrap}
.ft{padding:14px 36px;display:flex;justify-content:space-between;border-top:1px solid #eae7e2;margin-top:auto}
.ft span{font-size:6.5px;letter-spacing:1.5px;text-transform:uppercase;color:#ccc}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="page">
<div class="hdr">
  <div style="display:flex;align-items:center;gap:12px">
    <svg width="32" height="32" viewBox="0 0 34 34" fill="none"><rect x="4.5" y="2.5" width="25" height="25" stroke="#fff" stroke-width=".7" opacity=".4"/><rect x="2.5" y="4.5" width="25" height="25" stroke="#fff" stroke-width="1.1"/><rect x="7.5" y="10" width="4" height="13" fill="#fff"/><rect x="7.5" y="15.5" width="13" height="3" fill="#fff"/><rect x="16.5" y="10" width="4" height="13" fill="#fff"/></svg>
    <div><div style="color:#fff;font-size:13px;font-weight:600;letter-spacing:4px;text-transform:uppercase">Habitaris</div><div style="font-size:7px;letter-spacing:2px;color:rgba(255,255,255,.35);text-transform:uppercase;margin-top:1px">Arquitectura · Interiorismo</div></div>
  </div>
  <div class="hdr-right"><div class="doc">Ficha de cliente</div><div class="nm">${form.nombre||""}</div></div>
</div>
<div class="accent"></div>
<div class="body">
  <div class="sec"><div class="sec-t">Información general</div><div class="g3">
    <div class="f"><div class="fl">Nombre</div><div class="fv">${form.nombre||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Tipo</div><div class="fv"><span class="tag">${form.tipo||"—"}</span></div></div>
    <div class="f"><div class="fl">NIT / CIF / DNI</div><div class="fv">${form.nit||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Email</div><div class="fv">${form.email||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Móvil</div><div class="fv">${tel?(form.prefijoMovil||"+57")+" "+tel:'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Fijo</div><div class="fv">${form.telFijo||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Ciudad</div><div class="fv">${form.ciudad||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">País</div><div class="fv">${form.pais||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Dirección</div><div class="fv">${form.direccion||'<span class="e">—</span>'}</div></div>
  </div></div>
  <div class="sec"><div class="sec-t">Datos de facturación</div><div class="g3">
    <div class="f"><div class="fl">Razón social</div><div class="fv">${form.razonSocial||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Email facturación</div><div class="fv">${form.emailFactura||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Dir. facturación</div><div class="fv">${form.dirFacturacion||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Forma de pago</div><div class="fv">${form.formaPago||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Retenciones</div><div class="fv">${form.retenciones||'<span class="e">—</span>'}</div></div>
    <div class="f"><div class="fl">Detalle retenciones</div><div class="fv">${form.detalleRet||'<span class="e">—</span>'}</div></div>
  </div></div>
  ${form.notas?'<div class="sec"><div class="sec-t">Notas</div><div class="nbox">'+form.notas+'</div></div>':""}
</div>
<div class="ft"><span>Habitaris Suite · CRM</span><span>Generado ${new Date().toLocaleDateString("es-CO")}</span><span>Confidencial</span></div>
</div></body></html>`;
              const w = window.open("","_blank","width=800,height=1000");
              w.document.write(html); w.document.close();
              w.onafterprint = () => w.close();
              setTimeout(() => w.print(), 500);
            }}>PDF / Imprimir</Btn>'''
    
    c = c.replace(old_block, new_block)
    print("  ✓ PDF completely rewritten with real logo + clean design")
else:
    print(f"  ✗ PDF block not found (start={idx1}, end={idx2})")

# ═══════════════════════════════════════════════════════════════
# 2. ENHANCE "Actualizar desde briefing" to also pull from offer
# Replace the existing refresh button to also try offer data
# ═══════════════════════════════════════════════════════════════
old_refresh = '''            {form.briefingId && <Btn v="sec" on={() => {
              try {
                const raw = store.getSync("hab:briefing:" + form.briefingId);
                if (!raw) { alert("No se encontraron datos del briefing vinculado"); return; }
                const b = JSON.parse(raw);
                setForm(f => ({
                  ...f,
                  email: b.email || f.email,
                  telMovil: (b.telefono||"").replace(/^\\+57\\s*/, "") || f.telMovil,
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
            }}>Actualizar desde briefing</Btn>}'''

new_refresh = '''            {form.briefingId && <Btn v="sec" on={() => {
              try {
                const raw = store.getSync("hab:briefing:" + form.briefingId);
                if (raw) {
                  const b = JSON.parse(raw);
                  setForm(f => ({
                    ...f,
                    email: b.email || f.email,
                    telMovil: (b.telefono||"").replace(/^\\+57\\s*/, "") || f.telMovil,
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
                } else {
                  // Briefing data lost — try to find matching offer and populate from it
                  const raw4 = store.getSync("hab:v4");
                  if (raw4) {
                    const offers = JSON.parse(raw4) || [];
                    const ofr = offers.find(o => o.briefingId === form.briefingId);
                    if (ofr) {
                      setForm(f => ({
                        ...f,
                        email: ofr.emailCliente || ofr.email || f.email,
                        telMovil: (ofr.telCliente||"").replace(/^\\+57\\s*/, "") || f.telMovil,
                        ciudad: (ofr.ubicacion||"").split(" · ")[0] || f.ciudad,
                        razonSocial: ofr.razonSocial || f.razonSocial,
                        emailFactura: ofr.emailFactura || f.emailFactura,
                        dirFacturacion: ofr.dirFacturacion || f.dirFacturacion,
                        formaPago: ofr.formaPago || f.formaPago,
                        retenciones: ofr.retencion ? "Si" : f.retenciones,
                        detalleRet: ofr.detalleRet || f.detalleRet,
                        nit: ofr.documento || f.nit,
                      }));
                      alert("Datos actualizados desde la oferta vinculada");
                    } else {
                      alert("No se encontraron datos del briefing ni oferta vinculada");
                    }
                  } else {
                    alert("No se encontraron datos del briefing");
                  }
                }
              } catch(e) { alert("Error: " + e.message); }
            }}>Actualizar datos</Btn>}'''

if old_refresh in c:
    c = c.replace(old_refresh, new_refresh)
    print("  ✓ Refresh button enhanced (falls back to offer data)")
else:
    print("  ✗ Refresh button pattern not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
