import os
p = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src/modules/CRM.jsx")
with open(p) as f: c = f.read()

# 1. Check if Briefings already in NAV
if "formularios" not in c.split("const NAV")[1].split("];")[0]:
    c = c.replace(
        '  { id: "clientes",     lbl: "Clientes",        en: "Clients",        I: User },\n];',
        '  { id: "clientes",     lbl: "Clientes",        en: "Clients",        I: User },\n  { id: "formularios",  lbl: "Briefings",       en: "Briefings",      I: ClipboardList },\n];'
    )
    print("  ✓ Briefings re-added to NAV")
else:
    print("  - Briefings already in NAV")

# 2. Prevent duplicate offers from same briefing
old = '''  const createOfferFromBriefing = useCallback((b, sv) => {
    setPrefill(briefingToOffer(b)); sv("offer-new");
  }, []);'''

new = '''  const createOfferFromBriefing = useCallback((b, sv) => {
    if (offers.some(o => o.briefingId === b.id)) { alert("Ya existe una oferta creada desde este briefing"); return; }
    setPrefill(briefingToOffer(b)); sv("offer-new");
  }, [offers]);'''

if old in c:
    c = c.replace(old, new)
    print("  ✓ Duplicate offer prevention added")
else:
    print("  ✗ createOfferFromBriefing not found")

with open(p, "w") as f: f.write(c)
print("  Done!")
