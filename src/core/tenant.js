/**
 * core/tenant.js — Contexto multi-tenant
 */
import { sb } from "./supabase";

let _tenant = null;

export const tenant = {
  async load(tenantId) {
    try {
      const { data, error } = await sb.from("tenants").select("*").eq("id", tenantId).single();
      if (error) throw error;
      _tenant = data;
      return data;
    } catch {
      _tenant = {
        id: tenantId, nombre: "Habitaris", plan: "enterprise",
        modulos_activos: ["crm","formularios","rrhh","logistica","proyectos","dashboard",
          "aprobaciones","calidad","contabilidad","sst","biblioteca","postventa",
          "formacion","identidad","firma","legal","administracion","flotas","compras",
          "herramientas","configuracion"],
        max_usuarios: 50, config: null
      };
      return _tenant;
    }
  },
  get modules() { return _tenant?.modulos_activos || []; },
  hasModule(id) { return this.modules.includes(id); },
  get name() { return _tenant?.nombre || ""; },
  get plan() { return _tenant?.plan || "trial"; },
  get config() { return _tenant?.config || {}; },
  get id() { return _tenant?.id || null; },
  get data() { return _tenant; },
};

export default tenant;
