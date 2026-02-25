import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# Replace the entire PDF button with iframe-based print (no new tab)
old_start = '            <Btn icon={FileText} v="sec" on={() => {\n              const tel = (form.telMovil||"").replace(/^\\+57\\s*/,"");\n              const w = window.open("","_blank");'
new_start = '            <Btn icon={FileText} v="sec" on={() => {\n              const tel = (form.telMovil||"").replace(/^\\+57\\s*/,"");\n              let iframe = document.getElementById("__print_iframe"); if (iframe) iframe.remove(); iframe = document.createElement("iframe"); iframe.id = "__print_iframe"; iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;"; document.body.appendChild(iframe); const w = iframe.contentWindow;'

if old_start in c:
    c = c.replace(old_start, new_start)
    print("  ✓ Changed to iframe (no new tab)")
else:
    print("  ✗ window.open pattern not found")

# Replace the logo-mark div with real SVG
old_logo = '<div class="logo-mark">H</div>'
new_logo = '<svg width="36" height="36" viewBox="0 0 34 34" fill="none"><rect x="4.5" y="2.5" width="25" height="25" stroke="#fff" stroke-width="0.7" opacity="0.4"/><rect x="2.5" y="4.5" width="25" height="25" stroke="#fff" stroke-width="1.1"/><rect x="7.5" y="10" width="4" height="13" fill="#fff"/><rect x="7.5" y="15.5" width="13" height="3" fill="#fff"/><rect x="16.5" y="10" width="4" height="13" fill="#fff"/></svg>'

if old_logo in c:
    c = c.replace(old_logo, new_logo)
    print("  ✓ Real SVG logo in PDF")
else:
    print("  ✗ Logo pattern not found")

# Remove the old .logo-mark CSS since we use inline SVG now
old_logo_css = '                .logo-mark { width:36px; height:36px; border:2px solid #fff; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px; }'
if old_logo_css in c:
    c = c.replace(old_logo_css, '')
    print("  ✓ Removed old logo CSS")

# Fix the close/print — use iframe approach
old_print = "              w.document.close(); setTimeout(()=>w.print(), 300);"
new_print = "              w.document.close(); setTimeout(()=>{ iframe.contentWindow.print(); setTimeout(()=>iframe.remove(), 1000); }, 400);"

if old_print in c:
    c = c.replace(old_print, new_print)
    print("  ✓ Print via iframe (clean)")
else:
    print("  ✗ Print pattern not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
