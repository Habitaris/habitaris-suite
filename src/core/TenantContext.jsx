/**
 * core/TenantContext.jsx — Contexto multi-tenant (Capa 1, modo passthrough)
 *
 * Lee de las nuevas tablas (tenants, memberships, tenant_config, users)
 * SIN tocar el sistema de login actual. Si falla cualquier query, devuelve
 * null silenciosamente y la app sigue funcionando como hoy.
 *
 * Uso:
 *   import { useTenant } from "./core/TenantContext.jsx";
 *   const { tenant, tenantConfig, user, role, isReady } = useTenant();
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import { sb } from "./supabase.js";

const TenantCtx = createContext(null);

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
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Lee sesión escrita por src/modules/Login.jsx
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

        // Membership del user (puede no existir aún para users antiguos)
        let membership = null;
        try {
          const { data } = await sb
            .from("memberships")
            .select("*")
            .eq("user_id", userId)
            .limit(1);
          membership = (data && data[0]) || null;
        } catch (_) { /* tabla puede no existir aún en dev */ }

        const tenantId = (membership && membership.tenant_id) || "habitaris";

        // Tenant + config en paralelo
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

        // User completo (con username + display_name nuevos)
        let userData = null;
        try {
          const r3 = await sb
            .from("users")
            .select("id, username, display_name, email, nombre, rol")
            .eq("id", userId)
            .maybeSingle();
          userData = r3.data;
        } catch (_) {}

        if (cancelled) return;
        setState({
          loading: false,
          tenant: tenantData,
          tenantConfig: (configData && configData.config) || null,
          user: userData,
          role: (membership && membership.role) || (userData && userData.rol) || null,
          membership,
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

  const value = {
    ...state,
    isReady: !state.loading && !!state.tenant,
    countries: (state.tenantConfig && state.tenantConfig.countries) || ["CO"],
    countryDefault: (state.tenantConfig && state.tenantConfig.country_default) || "CO",
  };

  return <TenantCtx.Provider value={value}>{children}</TenantCtx.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantCtx);
  if (!ctx) return SAFE_DEFAULT;
  return ctx;
}

export default TenantProvider;
