import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# Find and replace entire PDF button block
pdf_start_marker = '            <Btn icon={FileText} v="sec" on={() => {'
pdf_end_marker = '}}>PDF / Imprimir</Btn>'

idx1 = c.find(pdf_start_marker)
idx2 = c.find(pdf_end_marker, idx1)

if idx1 > -1 and idx2 > -1:
    old_block = c[idx1:idx2 + len(pdf_end_marker)]
    
    new_block = r'''            <Btn icon={FileText} v="sec" on={() => {
              const tel = (form.telMovil||"").replace(/^\+57\s*/,"");
              const fv = (v) => v || '<span style="color:#ccc;font-style:italic">—</span>';
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${form.nombre} - Habitaris</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:20mm 0}
body{font-family:'DM Sans',sans-serif;color:#1a1a1a}
.page{max-width:170mm;margin:0 auto}
/* Logo area */
.logo-row{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.logo-svg{flex-shrink:0}
.brand{font-size:22px;font-weight:300;letter-spacing:1px;color:#1a1a1a}
.brand b{font-weight:800}
/* Divider */
.line{height:1px;background:#1a1a1a;margin:8px 0 20px}
/* Doc title + client */
.title-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px}
.doc-title{font-size:8px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:#999}
.client-name{font-size:20px;font-weight:700;letter-spacing:-.3px}
/* Sections */
.sec{margin-bottom:20px}
.sec-t{font-size:7.5px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#999;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #e5e2de}
.g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 20px}
.f{margin-bottom:11px}
.fl{font-size:6.5px;font-weight:600;letter-spacing:1.8px;text-transform:uppercase;color:#aaa;margin-bottom:1px}
.fv{font-size:11px;font-weight:500;color:#1a1a1a;line-height:1.3}
.tag{display:inline-block;padding:1px 7px;background:#f0efec;font-size:9px;font-weight:600;letter-spacing:.5px;color:#666}
.nbox{background:#faf9f7;border-left:2px solid #ddd;padding:10px 14px;font-size:10px;line-height:1.7;color:#666;white-space:pre-wrap}
/* Footer */
.ft{margin-top:30px;padding-top:10px;border-top:1px solid #e5e2de;display:flex;justify-content:space-between}
.ft span{font-size:6px;letter-spacing:1.5px;text-transform:uppercase;color:#bbb}
</style></head><body>
<div class="page">
  <div class="logo-row">
    <svg class="logo-svg" width="38" height="38" viewBox="0 0 34 34" fill="none">
      <rect x="4.5" y="2.5" width="25" height="25" stroke="#1a1a1a" stroke-width=".7" opacity=".35"/>
      <rect x="2.5" y="4.5" width="25" height="25" stroke="#1a1a1a" stroke-width="1.2"/>
      <rect x="7.5" y="10" width="4" height="13" fill="#1a1a1a"/>
      <rect x="7.5" y="15.5" width="13" height="3" fill="#1a1a1a"/>
      <rect x="16.5" y="10" width="4" height="13" fill="#1a1a1a"/>
    </svg>
    <div class="brand"><b>H</b>abitaris</div>
  </div>
  <div class="line"></div>
  <div class="title-row">
    <span class="doc-title">Ficha de cliente</span>
    <span class="client-name">${form.nombre||""}</span>
  </div>

  <div class="sec"><div class="sec-t">Información general</div><div class="g">
    <div class="f"><div class="fl">Nombre</div><div class="fv">${fv(form.nombre)}</div></div>
    <div class="f"><div class="fl">Tipo</div><div class="fv"><span class="tag">${form.tipo||"—"}</span></div></div>
    <div class="f"><div class="fl">NIT / CIF / DNI</div><div class="fv">${fv(form.nit)}</div></div>
    <div class="f"><div class="fl">Email</div><div class="fv">${fv(form.email)}</div></div>
    <div class="f"><div class="fl">Móvil</div><div class="fv">${tel?(form.prefijoMovil||"+57")+" "+tel:fv("")}</div></div>
    <div class="f"><div class="fl">Fijo</div><div class="fv">${fv(form.telFijo)}</div></div>
    <div class="f"><div class="fl">Ciudad</div><div class="fv">${fv(form.ciudad)}</div></div>
    <div class="f"><div class="fl">País</div><div class="fv">${fv(form.pais)}</div></div>
    <div class="f"><div class="fl">Dirección</div><div class="fv">${fv(form.direccion)}</div></div>
  </div></div>

  <div class="sec"><div class="sec-t">Datos de facturación</div><div class="g">
    <div class="f"><div class="fl">Razón social</div><div class="fv">${fv(form.razonSocial)}</div></div>
    <div class="f"><div class="fl">Email facturación</div><div class="fv">${fv(form.emailFactura)}</div></div>
    <div class="f"><div class="fl">Dir. facturación</div><div class="fv">${fv(form.dirFacturacion)}</div></div>
    <div class="f"><div class="fl">Forma de pago</div><div class="fv">${fv(form.formaPago)}</div></div>
    <div class="f"><div class="fl">Retenciones</div><div class="fv">${fv(form.retenciones)}</div></div>
    <div class="f"><div class="fl">Detalle retenciones</div><div class="fv">${fv(form.detalleRet)}</div></div>
  </div></div>

  ${form.notas?'<div class="sec"><div class="sec-t">Notas</div><div class="nbox">'+form.notas+'</div></div>':""}

  <div class="ft"><span>Habitaris Suite · CRM</span><span>${new Date().toLocaleDateString("es-CO")}</span><span>Confidencial</span></div>
</div></body></html>`;
              const w = window.open("","_blank","width=800,height=1000");
              w.document.write(html); w.document.close();
              w.onafterprint = () => w.close();
              setTimeout(() => w.print(), 500);
            }}>PDF / Imprimir</Btn>'''
    
    c = c.replace(old_block, new_block)
    print("  ✓ PDF rewritten: black logo on white, clean minimal design")
else:
    print(f"  ✗ PDF block not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
