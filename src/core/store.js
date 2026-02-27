/* ═══════════════════════════════════════════════════════════════
   HABITARIS STORE — Multi-tenant cloud storage with sync cache
   ═══════════════════════════════════════════════════════════════
   Key design: localStorage was synchronous. Supabase is async.
   Solution: in-memory cache gives sync reads, async writes to cloud.

   Usage:
     import { store } from "../core/store.js";
     await store.init("habitaris", "user123");  // once at app start

     store.getSync("hab:v4")          // instant, from RAM
     store.set("hab:v4", jsonString)   // writes RAM + Supabase background
     await store.get("hab:v4")         // async read from Supabase (fallback)
     await store.list("hab:briefing:") // list keys by prefix
     await store.delete("hab:v4")      // remove from both
   ═══════════════════════════════════════════════════════════════ */

import { sb } from "./supabase.js";

const TABLE = "kv_store";
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

let _tenantId = "habitaris";
let _userId = null;
let _cache = {};          // key → value (string)
let _ready = false;
let _retryQueue = [];     // [{ key, value, attempts }]
let _retryTimer = null;

/* ── Retry helper: exponential backoff ── */
async function _upsertWithRetry(key, value, attempt = 0) {
  try {
    const { error } = await sb
      .from(TABLE)
      .upsert(
        { tenant_id: _tenantId, key, value, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,key" }
      );

    if (error) {
      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY * Math.pow(2, attempt);
        console.warn(`[store] set(${key}) failed (attempt ${attempt + 1}/${MAX_RETRIES}), retry in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        return _upsertWithRetry(key, value, attempt + 1);
      }
      console.error(`[store] set(${key}) FAILED after ${MAX_RETRIES} retries:`, error.message);
      _addToRetryQueue(key, value);
      return false;
    }
    return true;
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, attempt);
      console.warn(`[store] set(${key}) network error (attempt ${attempt + 1}/${MAX_RETRIES}), retry in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return _upsertWithRetry(key, value, attempt + 1);
    }
    console.error(`[store] set(${key}) NETWORK FAILED after ${MAX_RETRIES} retries:`, e.message);
    _addToRetryQueue(key, value);
    return false;
  }
}

/* ── Retry queue for persistent failures ── */
function _addToRetryQueue(key, value) {
  // Replace existing entry for same key (only latest value matters)
  _retryQueue = _retryQueue.filter(item => item.key !== key);
  _retryQueue.push({ key, value, addedAt: Date.now() });

  // Start background retry if not already running
  if (!_retryTimer && _retryQueue.length > 0) {
    _retryTimer = setTimeout(_processRetryQueue, 30000); // retry in 30s
  }
}

async function _processRetryQueue() {
  _retryTimer = null;
  if (_retryQueue.length === 0) return;

  console.log(`[store] Retrying ${_retryQueue.length} failed write(s)...`);
  const queue = [..._retryQueue];
  _retryQueue = [];

  for (const item of queue) {
    // Use latest cache value (may have been updated since failure)
    const currentValue = _cache[item.key];
    if (currentValue === undefined) continue; // was deleted, skip

    const ok = await _upsertWithRetry(item.key, currentValue, 0);
    if (ok) {
      console.log(`[store] Retry succeeded for ${item.key}`);
    }
    // If it fails again, _upsertWithRetry re-adds to queue
  }

  // Schedule next round if there are still failures
  if (_retryQueue.length > 0) {
    _retryTimer = setTimeout(_processRetryQueue, 60000); // back off to 60s
  }
}

const store = {

  /* ── Initialize + preload all tenant data into RAM cache ── */
  async init(tenantId = "habitaris", userId = null) {
    _tenantId = tenantId;
    _userId = userId;

    try {
      const { data, error } = await sb
        .from(TABLE)
        .select("key, value")
        .eq("tenant_id", _tenantId);

      if (!error && data) {
        _cache = {};
        data.forEach(row => { _cache[row.key] = row.value; });
        console.log(`[store] ✓ Loaded ${data.length} keys for tenant "${_tenantId}"`);
      } else if (error) {
        console.warn("[store] Preload error:", error.message);
      }
    } catch (e) {
      console.warn("[store] Preload failed, starting with empty cache:", e.message);
    }

    _ready = true;
  },

  /* ── Sync read from RAM (like localStorage.getItem) ── */
  getSync(key) {
    const v = _cache[key] ?? null;
    return (v !== null && typeof v !== "string") ? JSON.stringify(v) : v;
  },

  /* ── Async read from Supabase (fallback/refresh) ── */
  async get(key) {
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

  /* ── Write to RAM immediately + Supabase with retry ── */
  set(key, value) {
    _cache[key] = value;
    _upsertWithRetry(key, value);
  },

  /* ── Delete from both ── */
  async delete(key) {
    delete _cache[key];
    // Also remove from retry queue
    _retryQueue = _retryQueue.filter(item => item.key !== key);

    try {
      const { error } = await sb
        .from(TABLE)
        .delete()
        .eq("tenant_id", _tenantId)
        .eq("key", key);

      if (error) console.warn(`[store] delete(${key}) error:`, error.message);
    } catch (e) {
      console.warn(`[store] delete(${key}) network error:`, e.message);
    }
  },

  /* ── List keys by prefix ── */
  async list(prefix = "") {
    const cached = Object.keys(_cache)
      .filter(k => k.startsWith(prefix))
      .map(k => ({ key: k, value: _cache[k] }));

    if (cached.length > 0) {
      return { keys: cached.map(c => c.key), items: cached };
    }

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

  /* ── Sync list from cache ── */
  listSync(prefix = "") {
    const items = Object.entries(_cache)
      .filter(([k]) => k.startsWith(prefix))
      .map(([key, value]) => ({ key, value }));
    return { keys: items.map(i => i.key), items };
  },

  /* ── Status ── */
  get ready() { return _ready; },
  get tenantId() { return _tenantId; },
  get cacheSize() { return Object.keys(_cache).length; },
  get pendingRetries() { return _retryQueue.length; },
};

export { store };
