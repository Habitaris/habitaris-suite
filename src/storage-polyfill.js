/**
 * ═══════════════════════════════════════════════════════════════
 * HABITARIS STORAGE POLYFILL
 * ═══════════════════════════════════════════════════════════════
 *
 * Hace que window.storage funcione en CUALQUIER navegador
 * usando localStorage como backend.
 *
 * Todos los módulos (CRM, RRHH, Logística) usan window.storage
 * directamente. Este polyfill intercepta esas llamadas y las
 * redirige a localStorage, así no hay que cambiar NADA en el
 * código existente.
 *
 * MODO LOCAL:   localStorage (funciona offline, un solo dispositivo)
 * MODO FUTURO:  Reemplazar este archivo por versión Supabase
 *               para sincronización multi-dispositivo
 * ═══════════════════════════════════════════════════════════════
 */

(function initStoragePolyfill() {
  // Si ya existe window.storage (ej: dentro de Claude), no hacer nada
  if (window.storage && typeof window.storage.get === "function") {
    console.log("📦 Storage: usando storage nativo (Claude/Anthropic)");
    return;
  }

  console.log("📦 Storage: usando localStorage (polyfill web)");

  window.storage = {
    async get(key, shared) {
      try {
        const k = shared ? `shared:${key}` : key;
        const val = localStorage.getItem(k);
        if (val === null) throw new Error("not found");
        return { key, value: val, shared: !!shared };
      } catch {
        return null;
      }
    },

    async set(key, value, shared) {
      try {
        const k = shared ? `shared:${key}` : key;
        localStorage.setItem(k, typeof value === "string" ? value : JSON.stringify(value));
        return { key, value, shared: !!shared };
      } catch (e) {
        console.error("Storage set error:", e);
        return null;
      }
    },

    async delete(key, shared) {
      try {
        const k = shared ? `shared:${key}` : key;
        localStorage.removeItem(k);
        return { key, deleted: true, shared: !!shared };
      } catch {
        return null;
      }
    },

    async list(prefix, shared) {
      try {
        const keys = [];
        const pfx = shared ? `shared:${prefix || ""}` : (prefix || "");
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(pfx)) {
            keys.push(shared ? k.replace(/^shared:/, "") : k);
          }
        }
        return { keys, prefix: prefix || "", shared: !!shared };
      } catch {
        return { keys: [], prefix: prefix || "", shared: !!shared };
      }
    },
  };
})();
