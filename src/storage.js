/**
 * storage.js — Capa de datos de Habitaris Suite
 * 
 * En Claude Artifacts: usa window.storage (API del plugin)
 * En producción (StackBlitz / Vercel): usa localStorage
 * Migración futura a Supabase: solo cambiar este archivo
 */

const isClaudeArtifacts = typeof window !== 'undefined' && window.storage?.get;

export const storage = {
  async get(key) {
    try {
      if (isClaudeArtifacts) {
        const r = await window.storage.get(key);
        return r ? JSON.parse(r.value) : null;
      } else {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      }
    } catch { return null; }
  },

  async set(key, value) {
    try {
      const str = JSON.stringify(value);
      if (isClaudeArtifacts) {
        await window.storage.set(key, str);
      } else {
        localStorage.setItem(key, str);
      }
      return true;
    } catch { return false; }
  },

  async delete(key) {
    try {
      if (isClaudeArtifacts) {
        await window.storage.delete(key);
      } else {
        localStorage.removeItem(key);
      }
      return true;
    } catch { return false; }
  },

  async list(prefix = '') {
    try {
      if (isClaudeArtifacts) {
        const r = await window.storage.list(prefix);
        return r?.keys || [];
      } else {
        return Object.keys(localStorage).filter(k => k.startsWith(prefix));
      }
    } catch { return []; }
  }
};

// Keys de la aplicación — un solo lugar para cambiarlos
export const KEYS = {
  // CRM
  offers:        'hab:v4',
  briefing:      (id) => `hab:briefing:${id}`,
  clientes:      'hab:crm:clientes2',
  proveedores:   'hab:crm:proveedores',
  equiposBib:    'hab:crm:equipos',
  // RRHH
  partes:        'hab:rrhh:partes',
  equipo:        'hab:rrhh:equipo',
  cargos:        'hab:rrhh:cargos',
  novedades:     'hab:rrhh:novedades',
  // Proyectos / Gantt
  actividades:   (ofertaId) => `hab:proj:actividades:${ofertaId}`,
};
