/**
 * core/TenantContext.jsx — Contexto multi-tenant (Sprint A — modelo holding)
 *
 * Capa 1: tenants, memberships, tenant_config, users (passthrough robusto).
 * Capa 2: paisActivo + setPaisActivo (sessionStorage).
 * Sprint A:
 *   - companies del tenant cargadas
 *   - companyActiva + setCompanyActiva (sessionStorage)
 *   - helper can(modulo, accion) que aplica el template de permisos
 *
 * Si cualquier query falla, el provider entrega valores seguros y la app
 * sigue funcionando exactamente como antes (modo passthrough).
 *
 * Uso:
 *   const {
 *     tenant, tenantConfig, user, role, membership,
 *     paisActivo, setPaisActivo, paisesAcceso,
 *     companies, companyActiva, setCompanyActiva, empresasAcceso,
 *     can, isReady,
 *   } = useTenant();
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { sb } from "./supabase.js";

const TenantCtx = createContext(null);
const PAIS_KEY = "hab:pais_activo";
const COMPANY_KEY = "hab:company_activa";

// Niveles ordenados de permiso
const PERM_LEVELS = { none: 0, read: 1, write: 2, admin: 3 };

const SAFE_DEFAULT = {
  loading: false,
  tenant: null,
  tenantConfig: null,
  user: null,
  role: null,
  membership: null,
  isReady: false,
  countries: ["CO"],
  countryDefault: "CO",
  paisActivo: "CO",
  setPaisActivo: () => {},
  paisesAcceso: ["CO"],
  companies: [],
  companyActiva: null,
  setCompanyActiva: () => {},
  empresasAcceso: [],
  permTemplate: null,
  can: () => false,
  error: null,
};

export function TenantProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    tenant: null,
    tenantConfig: null,
    user: null,
    role: null,
    membership: null,
    paisActivo: null,
    companies: [],
    companyActiva: null,
    permTemplate: null,
    error: null,
  });

  const setPaisActivo = useCallback((nuevoPais) => {
    if (!nuevoPais) return;
    try { sessionStorage.setItem(PAIS_KEY, nuevoPais); } catch (_) {}
    setState(s => ({ ...s, paisActivo: nuevoPais }));
  }, []);

  const setCompanyActiva = useCallback((companyOrIdOrSlug) => {
    if (!companyOrIdOrSlug) return;
    setState(s => {
      // Resolver: si pasamos un objeto, usarlo. Si pasamos string, buscar en companies por id o slug.
      let target = null;
      if (typeof companyOrIdOrSlug === "object") {
        target = companyOrIdOrSlug;
      } else {
        target = (s.companies || []).find(
          c => c.id === companyOrIdOrSlug || c.slug === companyOrIdOrSlug
        );
      }
      if (!target) return s;
      try { sessionStorage.setItem(COMPANY_KEY, target.id); } catch (_) {}
      return { ...s, companyActiva: target, paisActivo: target.pais };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const raw = sessionStorage.getItem("hab:session");
        if (!raw) {
          if (!cancelled) setState(s => ({ ...s, loading: false }));
          return;
        }
        let sess;
        try { sess = JSON.parse(raw); } catch { sess = null; }
        const userId = sess && sess.user && sess.user.id;
        if (!userId) {
          if (!cancelled) setState(s => ({ ...s, loading: false }));
          return;
        }

        // 1. Membership del user (incluye empresas_acceso, template_id, permissions)
        let membership = null;
        try {
          const { data } = await sb
            .from("memberships")
            .select("*")
            .eq("user_id", userId)
            .limit(1);
          membership = (data && data[0]) || null;
        } catch (_) {}

        const tenantId = (membership && membership.tenant_id) || "habitaris";

        // 2. Tenant + tenant_config
        let tenantData = null;
        let configData = null;
        try {
          const r1 = await sb.from("tenants").select("*").eq("id", tenantId).maybeSingle();
          tenantData = r1.data;
        } catch (_) {}
        try {
          const r2 = await sb.from("tenant_config").select("config").eq("tenant_id", tenantId).maybeSingle();
          configData = r2.data;
        } catch (_) {}

        // 3. User
        let userData = null;
        try {
          const r3 = await sb
            .from("users")
            .select("id, username, display_name, email, nombre, rol, preferred_locale")
            .eq("id", userId)
            .maybeSingle();
          userData = r3.data;
        } catch (_) {}

        // 4. Companies del tenant filtradas por empresas_acceso del user
        let companies = [];
        try {
          let q = sb.from("companies").select("*").eq("tenant_id", tenantId).eq("status", "active");
          // Si el user tiene empresas_acceso definido, filtramos
          if (membership && Array.isArray(membership.empresas_acceso) && membership.empresas_acceso.length > 0) {
            q = q.in("id", membership.empresas_acceso);
          }
          const { data } = await q;
          companies = data || [];
        } catch (_) {}

        // 5. Permission template (si el membership tiene template_id)
        let permTemplate = null;
        if (membership && membership.template_id) {
          try {
            const { data } = await sb
              .from("permission_templates")
              .select("*")
              .eq("id", membership.template_id)
              .maybeSingle();
            permTemplate = data;
          } catch (_) {}
        }

        // Determinar país activo
        let paisActivo = null;
        try { paisActivo = sessionStorage.getItem(PAIS_KEY); } catch (_) {}
        if (!paisActivo) paisActivo = (membership && membership.pais_default) || null;
        if (!paisActivo) paisActivo = (configData && configData.config && configData.config.country_default) || "CO";

        // Determinar company activa: sessionStorage > única empresa > primera empresa del país activo
        let companyActiva = null;
        let storedCompanyId = null;
        try { storedCompanyId = sessionStorage.getItem(COMPANY_KEY); } catch (_) {}
        if (storedCompanyId) {
          companyActiva = companies.find(c => c.id === storedCompanyId) || null;
        }
        if (!companyActiva && companies.length === 1) {
          companyActiva = companies[0];
          // Si solo hay 1 empresa, ajustamos el país al de ella
          paisActivo = companyActiva.pais;
        }
        if (!companyActiva && companies.length > 0) {
          companyActiva = companies.find(c => c.pais === paisActivo) || null;
        }

        if (cancelled) return;
        setState({
          loading: false,
          tenant: tenantData,
          tenantConfig: (configData && configData.config) || null,
          user: userData,
          role: (membership && membership.role) || (userData && userData.rol) || null,
          membership,
          paisActivo,
          companies,
          companyActiva,
          permTemplate,
          error: null,
        });
      } catch (e) {
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: (e && e.message) || "Error" }));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Helper: ¿el user puede hacer X en módulo Y?
  // Niveles: none < read < write < admin
  // Lógica: membership.permissions > permTemplate.permissions > "none"
  // Si role==='owner' o permissions._global==='admin' → siempre true
  const can = useCallback((modulo, accion = "read") => {
    const need = PERM_LEVELS[accion] != null ? PERM_LEVELS[accion] : 1;
    const role = (state.membership && state.membership.role) || state.role;
    if (role === "owner") return true;

    // Permisos directos en membership
    let perms = (state.membership && state.membership.permissions) || {};
    // Fallback: plantilla
    if (Object.keys(perms).length === 0 && state.permTemplate && state.permTemplate.permissions) {
      perms = state.permTemplate.permissions;
    }

    if (perms._global === "admin") return true;

    const have = perms[modulo] || perms._default || "none";
    const haveLevel = PERM_LEVELS[have] != null ? PERM_LEVELS[have] : 0;
    return haveLevel >= need;
  }, [state.membership, state.role, state.permTemplate]);

  const paisesAcceso = useMemo(() =>
    (state.membership && state.membership.paises_acceso) ||
    ((state.tenantConfig && state.tenantConfig.countries) || ["CO"]),
    [state.membership, state.tenantConfig]
  );

  const empresasAcceso = useMemo(() =>
    (state.membership && state.membership.empresas_acceso) || [],
    [state.membership]
  );

  const value = {
    ...state,
    isReady: !state.loading && !!state.tenant,
    countries: (state.tenantConfig && state.tenantConfig.countries) || ["CO"],
    countryDefault: (state.tenantConfig && state.tenantConfig.country_default) || "CO",
    paisesAcceso,
    setPaisActivo,
    empresasAcceso,
    setCompanyActiva,
    can,
  };

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantCtx);
  if (!ctx) return SAFE_DEFAULT;
  return ctx;
}

export default TenantProvider;
