/**
 * HABITARIS STORAGE POLYFILL — CLOUD (Supabase kv_store)
 *
 * window.storage → Supabase kv_store (cloud first)
 *                → localStorage (cache + offline fallback)
 *
 * Todos los módulos usan window.storage directamente.
 * Este polyfill intercepta esas llamadas y las envía a Supabase.
 */

import { createClient } from "@supabase/supabase-js";

const SB_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rzc2thdG5pa3VhdmVmaCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzQwMTUyOTk3LCJleHAiOjIwNTU3Mjg5OTd9.DP5x1hNbnTSzIFRMFOG7tYbykaAJMc6BRXYC_dFNFgE";

const sb = createClient(SB_URL, SB_KEY);

// Cache en memoria — evita llamadas repetidas a Supabase
const _cache = new Map();
const CACHE_TTL = 30000; // 30 segundos

function cacheGet(key) {
  const e = _cache.get(key);
  if (!e) return undefined;
  if (Date.now() - e.ts > CACHE_TTL) { _cache.delete(key); return undefined; }
  return e.val;
}
function cacheSet(key, val) { _cache.set(key, { val, ts: Date.now() }); }

console.log("📦 Storage: Supabase cloud + localStorage cache");

window.storage = {

  async get(key, shared) {
    const k = shared ? `shared:${key}` : key;

    // 1. Cache memoria
    const cached = cacheGet(k);
    if (cached !== undefined) return { key, value: cached, shared: !!shared };

    // 2. Supabase
    try {
      const { data, error } = await sb
        .from("kv_store")
        .select("value")
        .eq("key", k)
        .maybeSingle();

      if (!error && data) {
        const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
        cacheSet(k, val);
        localStorage.setItem(k, val);
        return { key, value: val, shared: !!shared };
      }
    } catch (e) {
      console.warn("[storage] Cloud read failed:", e);
    }

    // 3. localStorage fallback
    try {
      const val = localStorage.getItem(k);
      if (val !== null) {
        cacheSet(k, val);
        return { key, value: val, shared: !!shared };
      }
    } catch (ex) { /* ignore */ }

    return null;
  },

  async set(key, value, shared) {
    const k = shared ? `shared:${key}` : key;
    const str = typeof value === "string" ? value : JSON.stringify(value);

    // Siempre guardar en cache + localStorage
    cacheSet(k, str);
    try { localStorage.setItem(k, str); } catch (ex) { /* ignore */ }

    // Escribir a Supabase
    try {
      let jsonVal;
      try { jsonVal = JSON.parse(str); } catch (ex) { jsonVal = str; }

      const { error } = await sb.from("kv_store").upsert(
        { key: k, value: jsonVal, user_id: "shared", updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) console.warn("[storage] Cloud write failed:", error);
    } catch (e) {
      console.warn("[storage] Cloud write error:", e);
    }

    return { key, value: str, shared: !!shared };
  },

  async delete(key, shared) {
    const k = shared ? `shared:${key}` : key;
    _cache.delete(k);
    try { localStorage.removeItem(k); } catch (ex) { /* ignore */ }

    try {
      await sb.from("kv_store").delete().eq("key", k);
    } catch (e) {
      console.warn("[storage] Cloud delete failed:", e);
    }

    return { key, deleted: true, shared: !!shared };
  },

  async list(prefix, shared) {
    const pfx = shared ? `shared:${prefix || ""}` : (prefix || "");

    try {
      const { data, error } = await sb
        .from("kv_store")
        .select("key")
        .like("key", `${pfx}%`);

      if (!error && data) {
        const keys = data.map(r => shared ? r.key.replace(/^shared:/, "") : r.key);
        return { keys, prefix: prefix || "", shared: !!shared };
      }
    } catch (e) {
      console.warn("[storage] Cloud list failed:", e);
    }

    // Fallback localStorage
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(pfx)) keys.push(shared ? k.replace(/^shared:/, "") : k);
    }
    return { keys, prefix: prefix || "", shared: !!shared };
  },
};
