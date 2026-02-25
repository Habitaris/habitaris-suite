/**
 * core/store.js — Almacenamiento multi-tenant para toda la suite
 * 
 * ÚNICA forma de leer/escribir datos en Habitaris.
 * Ningún módulo toca localStorage ni Supabase directamente.
 * 
 * Uso:
 *   import { store } from '../core/store';
 *   const ofertas = await store.get("hab:v4");
 *   await store.set("hab:v4", ofertas);
 */
import { sb } from "./supabase";

let _tenantId = null;
let _userId = null;
let _ready = false;
const _listeners = new Map();

export function init(tenantId, userId) {
  _tenantId = tenantId;
  _userId = userId || "shared";
  _ready = true;
}

function ensureReady() {
  if (!_ready) {
    // Auto-init from session if not manually called
    try {
      const s = JSON.parse(sessionStorage.getItem("hab_session") || "{}");
      init(s.tenantId || "habitaris", s.id || "shared");
    } catch {
      init("habitaris", "shared");
    }
  }
}

function cacheKey(key) { return `${_tenantId}::${key}`; }
function cacheGet(key) { try { const r = localStorage.getItem(cacheKey(key)); return r ? JSON.parse(r) : null; } catch { return null; } }
function cacheSet(key, value) { try { localStorage.setItem(cacheKey(key), JSON.stringify(value)); } catch {} }
function cacheDel(key) { try { localStorage.removeItem(cacheKey(key)); } catch {} }

export const store = {
  async get(key) {
    ensureReady();
    try {
      const { data, error } = await sb
        .from("kv_store").select("value")
        .eq("key", key).eq("tenant_id", _tenantId).maybeSingle();
      if (error) throw error;
      if (data) {
        const val = typeof data.value === "string" ? data.value : JSON.stringify(data.value);
        cacheSet(key, val);
        return val;
      }
      return cacheGet(key);
    } catch (err) {
      console.warn(`store.get("${key}") cloud error, using cache:`, err.message);
      return cacheGet(key);
    }
  },

  async set(key, value) {
    ensureReady();
    const val = typeof value === "string" ? value : JSON.stringify(value);
    cacheSet(key, val);
    try {
      const { error } = await sb
        .from("kv_store")
        .upsert({ key, tenant_id: _tenantId, user_id: _userId, value: val, updated_at: new Date().toISOString() },
          { onConflict: "tenant_id,key" });
      if (error) throw error;
      const fns = _listeners.get(key);
      if (fns) fns.forEach(fn => fn(val));
      return true;
    } catch (err) {
      console.error(`store.set("${key}") cloud error:`, err.message);
      return false;
    }
  },

  async delete(key) {
    ensureReady();
    cacheDel(key);
    try {
      const { error } = await sb.from("kv_store").delete().eq("key", key).eq("tenant_id", _tenantId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.error(`store.delete("${key}") error:`, err.message);
      return false;
    }
  },

  async list(prefix) {
    ensureReady();
    try {
      const { data, error } = await sb
        .from("kv_store").select("key, value")
        .eq("tenant_id", _tenantId).like("key", `${prefix}%`);
      if (error) throw error;
      return (data || []).map(r => ({
        key: r.key,
        value: typeof r.value === "string" ? r.value : JSON.stringify(r.value)
      }));
    } catch (err) {
      console.error(`store.list("${prefix}") error:`, err.message);
      return [];
    }
  },

  onChange(key, fn) {
    if (!_listeners.has(key)) _listeners.set(key, new Set());
    _listeners.get(key).add(fn);
    return () => _listeners.get(key).delete(fn);
  },

  get tenantId() { return _tenantId; },
  get userId() { return _userId; },
  get ready() { return _ready; },
};

export default store;
