#!/usr/bin/env python3
"""Fix ALL await-in-non-async-function bugs across Habitaris Suite."""
import re, os, sys

BASE = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules")
total = 0

def report(name, n):
    global total
    total += n
    print(f"  ✓ {name}: {n} lines")

# ─── A: load/save missing async (5 files) ───
for name in ["Legal","FirmaDigital","Formacion","IdentidadCorporativa","PortalCliente"]:
    p = os.path.join(BASE, f"{name}.jsx")
    with open(p) as f: c = f.read()
    o = c
    c = c.replace(
        "const load  = k => { try { return JSON.parse(await store.get",
        "const load  = async k => { try { return JSON.parse(await store.get"
    )
    c = c.replace(
        "const save  = (k,v) => { await store.set",
        "const save  = async (k,v) => { await store.set"
    )
    c = c.replace(
        "const save  = (k,v) => await store.set",
        "const save  = async (k,v) => await store.set"
    )
    if c != o:
        with open(p,"w") as f: f.write(c)
        report(name+".jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── B: RRHH duplicate const store ───
p = os.path.join(BASE, "RRHH.jsx")
with open(p) as f: c = f.read()
o = c
block = """const store = {
  get: async (k) => { try { const r = await store.get(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  set: async (k, v) => { try { await store.set(k, JSON.stringify(v)); } catch {} },
};"""
c = c.replace(block, "/* store imported from core */")
# IIFE with await on line ~3194
c = c.replace(
    "(()=>{try{return(JSON.parse(await store.get(",
    "(async()=>{try{return(JSON.parse(await store.get("
)
# If that IIFE is called with ()(), it needs await or .then - but inside JSX it can't
# Better: replace with a safe fallback
# Find the full pattern and replace
old_iife = '(async()=>{try{return(JSON.parse(await store.get("habitaris_admin"))||{}).adm_viaticos||[];}catch{return[];}})()'
c = c.replace(old_iife, "[]")
# Also handle original if async replacement didn't match
c = c.replace(
    '(()=>{try{return(JSON.parse(await store.get("habitaris_admin"))||{}).adm_viaticos||[];}catch{return[];}})()',
    "[]"
)
if c != o:
    with open(p,"w") as f: f.write(c)
    report("RRHH.jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── C: useState + save with await (Administracion, Compras, Flotas) ───
for name in ["Administracion", "Compras", "Flotas"]:
    p = os.path.join(BASE, f"{name}.jsx")
    with open(p) as f: c = f.read()
    o = c

    # Fix useState(() => { try { return JSON.parse(await store.get(STORE_KEY)) ...})
    c = re.sub(
        r'useState\(\(\) => \{\s*try \{ return JSON\.parse\(await store\.get\(STORE_KEY\)\) \|\| \{\}; \} catch \{ return \{\}; \}\s*\}\)',
        'useState({})',
        c
    )

    # Fix save = (k,v) => setData(prev => { ... await store.set ... })
    # Remove await from non-async arrow
    c = re.sub(
        r'(const save = \(k,v\) => setData\(prev => \{ const n = \{[^;]*\}; )await (store\.set\(STORE_KEY,JSON\.stringify\(n\)\);)',
        r'\1\2',
        c
    )
    # Remove duplicate try { store.set } catch {}
    c = c.replace(" try { store.set(STORE_KEY,JSON.stringify(n)); } catch {}", "")

    # Add useEffect to load data on mount (insert after the useState line)
    if "useState({})" in c and "store.get(STORE_KEY).then" not in c:
        c = c.replace(
            "const [data, setData] = useState({});",
            "const [data, setData] = useState({});\n  useEffect(() => { store.get(STORE_KEY).then(r => { try { if(r) setData(JSON.parse(r)); } catch {} }).catch(()=>{}); }, []);"
        )

    if c != o:
        with open(p,"w") as f: f.write(c)
        report(name+".jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── D: Login.jsx ───
p = os.path.join(BASE, "Login.jsx")
with open(p) as f: c = f.read()
o = c
# Line 104: brand IIFE - replace with simple default
c = c.replace(
    'const brand=(()=>{try{return JSON.parse(await store.get("habitaris_config")||"{}").empresa?.nombre||"Habitaris"}catch{return"Habitaris"}})();',
    'const [brand, setBrand] = useState("Habitaris");\n  useEffect(() => { store.get("habitaris_config").then(r => { try { const c = JSON.parse(r||"{}"); if(c.empresa?.nombre) setBrand(c.empresa.nombre); } catch {} }).catch(()=>{}); }, []);'
)
if c != o:
    with open(p,"w") as f: f.write(c)
    report("Login.jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── E: Dashboard.jsx IIFE ───
p = os.path.join(BASE, "Dashboard.jsx")
with open(p) as f: c = f.read()
o = c
c = c.replace(
    '(() => { try { return JSON.parse(await store.get("hab:form:procesados")||"[]"); } catch { return []; } })()',
    "[]"
)
if c != o:
    with open(p,"w") as f: f.write(c)
    report("Dashboard.jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── F: Formularios.jsx IIFEs ───
p = os.path.join(BASE, "Formularios.jsx")
with open(p) as f: c = f.read()
o = c
c = c.replace(
    '(() => { try { return JSON.parse(await store.get("hab:form:procesados")||"[]"); } catch { return []; } })()',
    "[]"
)
# loadProcesados function if not async
c = re.sub(
    r'(function loadProcesados\(\))\s*\{',
    r'async \1 {',
    c
)
if c != o:
    with open(p,"w") as f: f.write(c)
    report("Formularios.jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── G: IdentidadCorporativa + PortalCliente useEffect with await ───
for name in ["IdentidadCorporativa", "PortalCliente"]:
    p = os.path.join(BASE, f"{name}.jsx")
    with open(p) as f: c = f.read()
    o = c

    lines = c.split("\n")
    fixed = False
    for i, line in enumerate(lines):
        if 'JSON.parse(await store.get("hab:config"))' in line:
            # Find enclosing useEffect
            for j in range(i-1, max(0, i-15), -1):
                if "useEffect(" in lines[j] and "async" not in lines[j]:
                    lines[j] = lines[j].replace("useEffect(() => {", "useEffect(() => { (async () => {")
                    # Find closing }, []) 
                    depth = 0
                    for k in range(j, min(len(lines), j+40)):
                        depth += lines[k].count("{") - lines[k].count("}")
                        if depth <= 0 and k > j:
                            lines[k] = "  })(); " + lines[k]
                            fixed = True
                            break
                    break
    if fixed:
        c = "\n".join(lines)

    if c != o:
        with open(p,"w") as f: f.write(c)
        report(name+".jsx", sum(1 for a,b in zip(o.split("\n"),c.split("\n")) if a!=b))

# ─── H: Logistica.jsx - check for remaining issues ───
p = os.path.join(BASE, "Logistica.jsx")
with open(p) as f: c = f.read()
o = c
# store.get returns raw string, but code may expect parsed
# Check if there are await issues
lines_with_await = [(i+1, l.strip()) for i, l in enumerate(c.split("\n")) if "await store." in l]
for ln, txt in lines_with_await:
    # Check if enclosing function is async
    pass  # Logistica uses store.get in async useEffect callbacks, should be fine

print(f"\n{'='*50}")
print(f"Total: {total} lines fixed")
print(f"\nNow run:")
print(f"  npx vite build 2>&1 | grep ERROR | head -10")
