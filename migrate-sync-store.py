#!/usr/bin/env python3
"""
HABITARIS — Complete store migration
=====================================
Replaces ALL async store patterns with sync cache reads.

  await store.get("key")  →  store.getSync("key")
  await store.set("key", v) →  store.set("key", v)   (set is now sync-first)

Also removes:
  - Duplicate const store = {} blocks (RRHH, Logistica)
  - Broken async IIFEs
  - Unnecessary async wrappers
"""
import os, re

BASE = os.path.expanduser("~/Documents/GitHub/habitaris-suite/src")
total_files = 0
total_changes = 0

def process_file(path):
    global total_files, total_changes
    with open(path) as f:
        original = f.read()
    
    c = original
    name = os.path.basename(path)

    # ─── 1. Remove duplicate "const store = {" blocks ───
    # RRHH.jsx and any other file that redeclares store
    dup_block = re.compile(
        r'/\*[^*]*?(?:STORAGE|store)[^*]*?\*/\s*\n'
        r'const store = \{\s*\n'
        r'\s*get:\s*async[^\n]*\n'
        r'\s*set:\s*async[^\n]*\n'
        r'\};\s*\n',
        re.IGNORECASE
    )
    c = dup_block.sub('', c)
    
    # Also match without comment header
    dup_block2 = re.compile(
        r'\nconst store = \{\s*\n'
        r'\s*get:\s*async\s*\(k\)\s*=>[^\n]*\n'
        r'\s*set:\s*async\s*\(k,?\s*v\)\s*=>[^\n]*\n'
        r'\};\s*\n'
    )
    c = dup_block2.sub('\n', c)

    # ─── 2. Core replacement: await store.get → store.getSync ───
    # Handles: await store.get("key"), await store.get(variable), etc.
    c = c.replace('await store.get(', 'store.getSync(')

    # ─── 3. Remove await from store.set (it's now sync-first) ───
    c = c.replace('await store.set(', 'store.set(')

    # ─── 4. Fix getStore helper in Dashboard ───
    c = c.replace(
        'const getStore = async (key) => { try { const r = store.getSync(key); return r ? JSON.parse(r) : {}; } catch { return {}; } };',
        'const getStore = (key) => { try { const r = store.getSync(key); return r ? JSON.parse(r) : {}; } catch { return {}; } };'
    )
    # Also handle if it was already partially fixed
    c = re.sub(
        r'const getStore = async \(key\) => \{([^}]*?)store\.getSync\(key\)',
        r'const getStore = (key) => {\1store.getSync(key)',
        c
    )

    # ─── 5. Remove duplicate try { store.set(...) } catch {} after store.set ───
    # Pattern: store.set(KEY,JSON.stringify(n)); try { store.set(KEY,JSON.stringify(n)); } catch {}
    c = re.sub(
        r'(store\.set\([^;]+\);)\s*try\s*\{\s*store\.set\([^;]+\);\s*\}\s*catch\s*\{\s*\}',
        r'\1',
        c
    )

    # ─── 6. Clean up async on functions that no longer need it ───
    # const load = async k => { try { return JSON.parse(store.getSync(...)) → remove async
    c = re.sub(
        r'const load\s*=\s*async\s+k\s*=>\s*\{\s*try\s*\{\s*return JSON\.parse\(store\.getSync',
        r'const load = k => { try { return JSON.parse(store.getSync',
        c
    )
    # const save doesn't need async anymore (store.set is sync-first)
    c = re.sub(
        r'const save\s*=\s*async\s+\(k,\s*v\)\s*=>\s*\{\s*store\.set',
        r'const save = (k, v) => { store.set',
        c
    )
    c = re.sub(
        r'const save\s*=\s*async\s+\(k,\s*v\)\s*=>\s*store\.set',
        r'const save = (k, v) => store.set',
        c
    )

    # ─── 7. Fix async IIFEs that are no longer needed ───
    # (async () => { ... store.getSync ... })() → just inline
    # But only if there's no other await inside
    # For safety, replace (async () => { ... })() patterns that have NO remaining await
    def strip_unnecessary_async_iife(match):
        body = match.group(1)
        if 'await ' in body:
            return match.group(0)  # keep async, there's still an await
        return f'(() => {{{body}}})()'
    c = re.sub(r'\(async\s*\(\)\s*=>\s*\{(.*?)\}\)\(\)', strip_unnecessary_async_iife, c, flags=re.DOTALL)

    # ─── 8. Fix useEffect async wrappers that are no longer needed ───
    # useEffect(() => { (async () => { ...no await... })(); }, [])
    # → useEffect(() => { ...code... }, [])
    def strip_useeffect_async(match):
        body = match.group(1)
        deps = match.group(2)
        if 'await ' in body:
            return match.group(0)  # keep async wrapper
        # Remove the async IIFE wrapper
        return f'useEffect(() => {{{body}}}, {deps});'
    c = re.sub(
        r'useEffect\(\(\)\s*=>\s*\{\s*\(async\s*\(\)\s*=>\s*\{(.*?)\}\)\(\);\s*\},\s*(\[[^\]]*\])\);',
        strip_useeffect_async,
        c,
        flags=re.DOTALL
    )

    # ─── 9. Fix useState initializers that still have store.getSync in callback ───
    # useState(() => { try { return JSON.parse(store.getSync(KEY)) || {}; } ... })
    # This actually WORKS now since getSync is sync! No change needed.

    # ─── 10. Fix Proyectos useStore hook (was rewritten to use useEffect) ───
    # The .then() pattern also works, but let's use getSync for simplicity
    c = re.sub(
        r'const \[data, setData\] = useState\(init\);\s*\n'
        r'\s*useEffect\(\(\) => \{\s*\n'
        r'\s*store\.get\(lsKey\)\.then\(raw => \{\s*\n'
        r'\s*try \{ const d = JSON\.parse\(raw\)\|\|\{\}; if\(d\[key\]!=null\) setData\(d\[key\]\); \} catch \{\}\s*\n'
        r'\s*\}\)\.catch\(\(\)=>\{\}\);\s*\n'
        r'\s*\}, \[key\]\);',
        'const [data, setData] = useState(() => {\n'
        '    try { const d = JSON.parse(store.getSync(lsKey))||{}; return d[key]!=null ? d[key] : init; } catch { return init; }\n'
        '  });',
        c
    )
    # Fix the save function too
    c = re.sub(
        r'store\.get\(lsKey\)\.then\(raw => \{\s*\n'
        r'\s*try \{ const d = JSON\.parse\(raw\)\|\|\{\}; d\[key\]=val; store\.set\(lsKey,JSON\.stringify\(d\)\); \} catch \{\}\s*\n'
        r'\s*\}\)\.catch\(\(\)=>\{\}\);',
        'try { const d = JSON.parse(store.getSync(lsKey))||{}; d[key]=val; store.set(lsKey,JSON.stringify(d)); } catch {}',
        c
    )

    # ─── 11. Fix Login useState+useEffect for brand ───
    # Replace the useEffect pattern back with simple sync read
    c = re.sub(
        r'const \[brand, setBrand\] = useState\("Habitaris"\);\s*\n'
        r'\s*useEffect\(\(\) => \{ store\.get\("habitaris_config"\)\.then\(r => \{[^}]*\}\)\.catch\(\(\)=>\{\}\); \}, \[\]\);',
        'const brand = (() => { try { return JSON.parse(store.getSync("habitaris_config")||"{}").empresa?.nombre || "Habitaris"; } catch { return "Habitaris"; } })();',
        c
    )

    # ─── 12. Fix Administracion/Compras/Flotas useState+useEffect ───
    c = re.sub(
        r'const \[data, setData\] = useState\(\{\}\);\s*\n'
        r'\s*useEffect\(\(\) => \{ store\.get\(STORE_KEY\)\.then\(r => \{[^}]*\}\)\.catch\(\(\)=>\{\}\); \}, \[\]\);',
        'const [data, setData] = useState(() => { try { return JSON.parse(store.getSync(STORE_KEY)) || {}; } catch { return {}; } });',
        c
    )

    # ─── 13. Remove store.list references that used await (keep them async) ───
    # store.list is still async — these need to stay in useEffect with async
    # But check if we accidentally removed the await from store.list
    # store.list should stay async — re-add await if we stripped it
    # (our step 2 only touched store.get, not store.list, so this should be fine)

    # ─── 14. Clean up any remaining "async" on functions with no "await" ───
    # async function X() { ...no await... } → function X() { ... }
    # Be conservative: only do this for small functions (< 5 lines)
    lines = c.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r'^(\s*)async (function \w+\([^)]*\))\s*\{', line)
        if m:
            # Scan ahead for closing brace and check for await
            indent = m.group(1)
            depth = 1
            has_await = False
            j = i + 1
            while j < len(lines) and depth > 0:
                depth += lines[j].count('{') - lines[j].count('}')
                if 'await ' in lines[j]:
                    has_await = True
                j += 1
            if not has_await and (j - i) < 20:
                lines[i] = f'{indent}{m.group(2)} {{'
        i += 1
    c = '\n'.join(lines)

    # ─── Write if changed ───
    if c != original:
        with open(path, 'w') as f:
            f.write(c)
        changes = sum(1 for a, b in zip(original.split('\n'), c.split('\n')) if a != b)
        total_files += 1
        total_changes += changes
        print(f"  ✓ {name}: {changes} lines")
        return True
    return False

# ─── Process all files ───
print("=" * 55)
print("HABITARIS STORE MIGRATION — sync cache")
print("=" * 55)
print()

for root, dirs, files in os.walk(BASE):
    # Skip node_modules
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fn in sorted(files):
        if fn.endswith(('.jsx', '.js')):
            path = os.path.join(root, fn)
            process_file(path)

print()
print(f"{'=' * 55}")
print(f"  {total_files} files modified, {total_changes} lines changed")
print(f"{'=' * 55}")
print()

# ─── Verify: scan for remaining issues ───
print("Scanning for remaining issues...")
issues = 0
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d != 'node_modules']
    for fn in sorted(files):
        if fn.endswith(('.jsx', '.js')):
            path = os.path.join(root, fn)
            with open(path) as f:
                for i, line in enumerate(f, 1):
                    # await store.get should be gone
                    if 'await store.get(' in line:
                        print(f"  ⚠ {fn}:{i} — await store.get: {line.strip()[:70]}")
                        issues += 1
                    # await store.set should be gone
                    if 'await store.set(' in line:
                        print(f"  ⚠ {fn}:{i} — await store.set: {line.strip()[:70]}")
                        issues += 1
                    # duplicate const store
                    if re.match(r'^const store = \{', line.strip()) and fn != 'store.js':
                        print(f"  ⚠ {fn}:{i} — duplicate store: {line.strip()[:70]}")
                        issues += 1

if issues == 0:
    print("  ✅ No issues found!")
else:
    print(f"\n  ⚠ {issues} issues remaining — review manually")

print()
print("Next steps:")
print("  1. Copy new store.js:  cp store.js src/core/store.js")
print("  2. Build:              npx vite build 2>&1 | grep ERROR | head -10")
print("  3. Commit + push:      git add -A && git commit -m 'store: sync cache' && git push")
