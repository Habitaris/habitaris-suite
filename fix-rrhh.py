import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/RRHH.jsx")
with open(p) as f: c = f.read()

old = """  useEffect(()=>{
    // Cargar actividades de todos los proyectos exportados desde CRM
    const all = {};
    try {
      {
        // Buscar todas las claves hab:proj:actividades:*
        const listed = await store.list("hab:proj:actividades:");
        if (listed?.keys) {
          listed.keys.forEach(k=>{
            try {
              const data = await store.get(k);
              if (data?.value) {
                const acts = JSON.parse(data);
                const otId = k.replace("hab:proj:actividades:","");
                all[otId] = acts;
              }
            } catch{}
          });
        }
      }
    } catch{}
    setActividadesGantt(all);
  },[]);"""

new = """  useEffect(()=>{ (async () => {
    const all = {};
    try {
      const listed = await store.list("hab:proj:actividades:");
      if (listed?.keys) {
        for (const k of listed.keys) {
          try {
            const data = await store.get(k);
            if (data) {
              const acts = JSON.parse(data);
              const otId = k.replace("hab:proj:actividades:","");
              all[otId] = acts;
            }
          } catch{}
        }
      }
    } catch{}
    setActividadesGantt(all);
  })(); },[]);"""

if old in c:
    c = c.replace(old, new)
    with open(p, "w") as f: f.write(c)
    print("Fixed RRHH.jsx useEffect")
else:
    print("Pattern not found - checking for await issues...")
    for i, line in enumerate(c.split("\n"), 1):
        if "await store" in line and i > 1290 and i < 1320:
            print(f"  Line {i}: {line.strip()[:80]}")
