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
import { setTenantConfigCache } from "./configHelpers.js";

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
  reload: () => {},
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

  // Contador para forzar recarga manual (botón "Reintentar")
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    setReloadKey(k => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let completed = false;

    // Safeguard: si load tarda demasiado, no dejamos la app colgada en "Cargando…",
    // pero marcamos error explícito para que la UI muestre pantalla con botón "Reintentar".
    const safetyTimeout = setTimeout(() => {
      if (cancelled || completed) return;
      console.warn('[TenantContext] safety timeout (8s) — la carga no terminó a tiempo');
      setState(s => s.loading ? {
        ...s,
        loading: false,
        error: 'La base de datos está tardando en responder. Puede que esté arrancando — vuelve a intentarlo en unos segundos.',
      } : s);
    }, 8000);

    async function load() {
      console.log("[TC] A: load() start");
      try {
        // FIX race condition login -> /grupo: la sesión puede estar siendo escrita
        // por el flujo de login mientras este useEffect ya se está ejecutando. Esperamos
        // hasta 3 segundos con polling 250ms antes de asumir que NO hay sesión.
        let raw = sessionStorage.getItem("hab:session");
        console.log("[TC] B: raw initial:", !!raw, "len:", raw?raw.length:0);
        if (!raw) {
          const maxRetries = 12; // 12 * 250ms = 3000ms
          for (let i = 0; i < maxRetries && !raw; i++) {
            await new Promise(r => setTimeout(r, 250));
            if (cancelled) { console.log("[TC] C: polling cancelled"); return; }
            raw = sessionStorage.getItem("hab:session");
            if (raw) console.log("[TC] C: polling found raw at iter", i);
          }
        }
        if (!raw) {
          console.log("[TC] D: !raw FINAL — bailing out");
          if (!cancelled) {
            completed = true;
            setState(s => ({ ...s, loading: false, error: null }));
          }
          return;
        }
        console.log("[TC] D: raw OK after polling");
        let sess;
        try { sess = JSON.parse(raw); } catch { sess = null; }
        const userId = sess && sess.user && sess.user.id;
        console.log("[TC] E: userId:", userId);
        if (!userId) {
          if (!cancelled) {
            completed = true;
            setState(s => ({ ...s, loading: false, error: null }));
          }
          return;
        }

        // 1. Membership del user (incluye empresas_acceso, template_id, permissions)
        let membership = null;
        try {
          const { data, error } = await sb
            .from("memberships")
            .select("*")
            .eq("user_id", userId)
            .limit(1);
          if (error) console.error('[TenantContext] memberships error:', error);
          membership = (data && data[0]) || null;
        } catch (e) { console.error('[TenantContext] memberships exception:', e); }

        const tenantId = (membership && membership.tenant_id) || "habitaris";

        // 2. Tenant + tenant_config
        let tenantData = null;
        let configData = null;
        try {
          const { data, error } = await sb.from("tenants").select("*").eq("id", tenantId).maybeSingle();
          if (error) console.error('[TenantContext] tenants error:', error);
          tenantData = data;
        } catch (e) { console.error('[TenantContext] tenants exception:', e); }
        try {
          const { data, error } = await sb.from("tenant_config").select("config").eq("tenant_id", tenantId).maybeSingle();
          if (error) console.error('[TenantContext] tenant_config error:', error);
          configData = data;
        } catch (e) { console.error('[TenantContext] tenant_config exception:', e); }

        // 3. User
        let userData = null;
        try {
          const { data, error } = await sb
            .from("users")
            .select("id, username, display_name, email, nombre, rol, preferred_locale")
            .eq("id", userId)
            .maybeSingle();
          if (error) console.error('[TenantContext] users error:', error);
          userData = data;
        } catch (e) { console.error('[TenantContext] users exception:', e); }

        // 4. Companies del tenant filtradas por empresas_acceso del user
        let companies = [];
        try {
          let q = sb.from("companies").select("*").eq("tenant_id", tenantId).eq("status", "active");
          // Si el user tiene empresas_acceso definido, filtramos
          if (membership && Array.isArray(membership.empresas_acceso) && membership.empresas_acceso.length > 0) {
            q = q.in("id", membership.empresas_acceso);
          }
          const { data, error } = await q;
          if (error) console.error('[TenantContext] companies error:', error);
          companies = data || [];
        } catch (e) { console.error('[TenantContext] companies exception:', e); }

        // 5. Permission template (si el membership tiene template_id)
        let permTemplate = null;
        if (membership && membership.template_id) {
          try {
            const { data, error } = await sb
              .from("permission_templates")
              .select("*")
              .eq("id", membership.template_id)
              .maybeSingle();
            if (error) console.error('[TenantContext] permission_templates error:', error);
            permTemplate = data;
          } catch (e) { console.error('[TenantContext] permission_templates exception:', e); }
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

        // Validar carga: si no hay tenant, es estado roto y exponemos error
        const errMsg = !tenantData
          ? 'No se pudo cargar la información del grupo. La base de datos puede estar arrancando — espera unos segundos y reintenta.'
          : null;

        if (cancelled) return;
        completed = true;
        const _tenantConfigData = (configData && configData.config) || null;
        // Sprint C Capa 3: poblar cache global para uso en funciones planas (emails, PDFs).
        try { setTenantConfigCache(_tenantConfigData); } catch (_) {}
        console.log("[TC] F: ALL DATA READY, setting state with tenant");
        setState({
          loading: false,
          tenant: tenantData,
          tenantConfig: _tenantConfigData,
          user: userData,
          role: (membership && membership.role) || (userData && userData.rol) || null,
          membership,
          paisActivo,
          companies,
          companyActiva,
          permTemplate,
          error: errMsg,
        });
      } catch (e) {
        console.error('[TenantContext] error fatal en load():', e);
        if (!cancelled) {
          completed = true;
          console.error("[TC] G: CAUGHT EXCEPTION:", e && e.message, e && e.stack);
        setState(s => ({ ...s, loading: false, error: (e && e.message) || "Error cargando el contexto del grupo" }));
        }
      }
    }

    load();
    return () => { cancelled = true; clearTimeout(safetyTimeout); };
  }, [reloadKey]);

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

  const paisesAcceso = useMemo(() => {
    // Derivar de companies cargadas (filtradas por empresas_acceso del user)
    // Esto es la verdad: tienes acceso a los países donde tienes empresas accesibles
    const fromCompanies = Array.from(new Set((state.companies || []).map(c => c.pais).filter(Boolean)));
    if (fromCompanies.length > 0) return fromCompanies.sort();
    // Fallback durante la carga (antes de tener companies): usar membership o tenantConfig
    return (state.membership && state.membership.paises_acceso) ||
           ((state.tenantConfig && state.tenantConfig.countries) || ["CO"]);
  }, [state.companies, state.membership, state.tenantConfig]);

  const empresasAcceso = useMemo(() =>
    (state.membership && state.membership.empresas_acceso) || [],
    [state.membership]
  );

  // Países donde el tenant tiene empresas activas (verdad derivada de companies).
  // Si la lectura de companies aún no terminó, fallback a tenantConfig.countries.
  const countries = useMemo(() => {
    const fromCompanies = Array.from(new Set((state.companies || []).map(c => c.pais).filter(Boolean)));
    if (fromCompanies.length > 0) return fromCompanies.sort();
    return (state.tenantConfig && state.tenantConfig.countries) || ["CO"];
  }, [state.companies, state.tenantConfig]);

  const value = {
    ...state,
    isReady: !state.loading,
    countries,
    countryDefault: (state.tenantConfig && state.tenantConfig.country_default) || countries[0] || "CO",
    paisesAcceso,
    setPaisActivo,
    empresasAcceso,
    setCompanyActiva,
    can,
    reload,
  };

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantCtx);
  if (!ctx) return SAFE_DEFAULT;
  return ctx;
}

export default TenantProvider;
