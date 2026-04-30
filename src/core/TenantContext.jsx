/**
 * core/TenantContext.jsx — Contexto multi-tenant (Capa 1+2, modo passthrough)
 *
 * Lee de las nuevas tablas (tenants, memberships, tenant_config, users)
 * SIN tocar el sistema de login actual. Si falla cualquier query, devuelve
 * null silenciosamente y la app sigue funcionando como hoy.
 *
 * Capa 2 añade: paisActivo + setPaisActivo (persiste en sessionStorage).
 *
 * Uso:
 *   import { useTenant } from "./core/TenantContext.jsx";
 *   const { tenant, tenantConfig, user, role, paisActivo, setPaisActivo,
 *           paisesAcceso, isReady } = useTenant();
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { sb } from "./supabase.js";

const TenantCtx = createContext(null);
const PAIS_KEY = "hab:pais_activo";

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
    error: null,
  });

  const setPaisActivo = useCallback((nuevoPais) => {
    if (!nuevoPais) return;
    try { sessionStorage.setItem(PAIS_KEY, nuevoPais); } catch (_) {}
    setState(s => ({ ...s, paisActivo: nuevoPais }));
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

        let userData = null;
        try {
          const r3 = await sb
            .from("users")
            .select("id, username, display_name, email, nombre, rol")
            .eq("id", userId)
            .maybeSingle();
          userData = r3.data;
        } catch (_) {}

        // Determinar país activo: sessionStorage > membership.pais_default > tenant_config.country_default > "CO"
        let paisActivo = null;
        try { paisActivo = sessionStorage.getItem(PAIS_KEY); } catch (_) {}
        if (!paisActivo) paisActivo = (membership && membership.pais_default) || null;
        if (!paisActivo) paisActivo = (configData && configData.config && configData.config.country_default) || "CO";

        if (cancelled) return;
        setState({
          loading: false,
          tenant: tenantData,
          tenantConfig: (configData && configData.config) || null,
          user: userData,
          role: (membership && membership.role) || (userData && userData.rol) || null,
          membership,
          paisActivo,
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

  const paisesAcceso = (state.membership && state.membership.paises_acceso) ||
                       ((state.tenantConfig && state.tenantConfig.countries) || ["CO"]);

  const value = {
    ...state,
    isReady: !state.loading && !!state.tenant,
    countries: (state.tenantConfig && state.tenantConfig.countries) || ["CO"],
    countryDefault: (state.tenantConfig && state.tenantConfig.country_default) || "CO",
    paisesAcceso,
    setPaisActivo,
  };

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantCtx);
  if (!ctx) return SAFE_DEFAULT;
  return ctx;
}

export default TenantProvider;
