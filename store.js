/* ═══════════════════════════════════════════════════════════════
   HABITARIS STORE — Multi-tenant cloud storage with sync cache
   ═══════════════════════════════════════════════════════════════
   Key design: localStorage was synchronous. Supabase is async.
   Solution: in-memory cache gives sync reads, async writes to cloud.

   Usage:
     import { store } from "../core/store.js";
     await store.init("habitaris", "user123");  // once at app start

     store.getSync("hab:v4")          // instant, from RAM (like localStorage)
     store.set("hab:v4", jsonString)   // writes RAM + Supabase background
     await store.get("hab:v4")         // async read from Supabase (fallback)
     await store.list("hab:briefing:") // list keys by prefix
     await store.delete("hab:v4")      // remove from both
   ═══════════════════════════════════════════════════════════════ */

import { sb } from "./supabase.js";

const TABLE = "kv_store";
let _tenantId = "habitaris";
let _userId = null;
let _cache = {};          // key → value (string)
let _ready = false;

const store = {

  /* ── Initialize + preload all tenant data into RAM cache ── */
  async init(tenantId = "habitaris", userId = null) {
    _tenantId = tenantId;
    _userId = userId;

    try {
      // Load ALL keys for this tenant in one query
      const { data, error } = await sb
        .from(TABLE)
        .select("key, value")
        .eq("tenant_id", _tenantId);

      if (!error && data) {
        _cache = {};
        data.forEach(row => { _cache[row.key] = row.value; });
        console.log(`[store] Loaded ${data.length} keys for tenant ${_tenantId}`);
      }
    } catch (e) {
      console.warn("[store] Preload failed, starting with empty cache:", e.message);
    }

    _ready = true;
  },

  /* ── Sync read from RAM (like localStorage.getItem) ── */
  getSync(key) {
    return _cache[key] ?? null;
  },

  /* ── Async read from Supabase (fallback/refresh) ── */
  async get(key) {
    // Return from cache if available
    if (key in _cache) return _cache[key];

    try {
      const { data, error } = await sb
        .from(TABLE)
        .select("value")
        .eq("tenant_id", _tenantId)
        .eq("key", key)
        .single();

      if (!error && data) {
        _cache[key] = data.value;
        return data.value;
      }
    } catch (e) {
      console.warn(`[store] get(${key}) failed:`, e.message);
    }
    return null;
  },

  /* ── Write to RAM immediately + Supabase in background ── */
  set(key, value) {
    // Sync: update cache instantly
    _cache[key] = value;

    // Async: persist to Supabase (fire-and-forget)
    sb.from(TABLE)
      .upsert({ tenant_id: _tenantId, key, value, updated_at: new Date().toISOString() },
              { onConflict: "tenant_id,key" })
      .then(({ error }) => {
        if (error) console.warn(`[store] set(${key}) cloud error:`, error.message);
      });
  },

  /* ── Delete from both ── */
  async delete(key) {
    delete _cache[key];

    const { error } = await sb
      .from(TABLE)
      .delete()
      .eq("tenant_id", _tenantId)
      .eq("key", key);

    if (error) console.warn(`[store] delete(${key}) error:`, error.message);
  },

  /* ── List keys by prefix ── */
  async list(prefix = "") {
    // Try cache first
    const cached = Object.keys(_cache)
      .filter(k => k.startsWith(prefix))
      .map(k => ({ key: k, value: _cache[k] }));

    if (cached.length > 0) {
      return { keys: cached.map(c => c.key), items: cached };
    }

    // Fallback to Supabase
    try {
      const { data, error } = await sb
        .from(TABLE)
        .select("key, value")
        .eq("tenant_id", _tenantId)
        .like("key", `${prefix}%`);

      if (!error && data) {
        data.forEach(row => { _cache[row.key] = row.value; });
        return { keys: data.map(r => r.key), items: data };
      }
    } catch (e) {
      console.warn(`[store] list(${prefix}) error:`, e.message);
    }
    return { keys: [], items: [] };
  },

  /* ── Status ── */
  get ready() { return _ready; },
  get tenantId() { return _tenantId; },
  get cacheSize() { return Object.keys(_cache).length; },
};

export { store };
