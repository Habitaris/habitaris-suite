/**
 * core/auth.js — Autenticación centralizada
 */
import { sb } from "./supabase";

const SESSION_KEY = "hab_session";
const SESSION_TTL = 24 * 60 * 60 * 1000;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export const auth = {
  async login(email, password) {
    const hash = await sha256(password);
    const { data, error } = await sb.from("users")
      .select("id, email, nombre, rol, tenant_id, activo")
      .eq("email", email.toLowerCase().trim()).eq("password_hash", hash).single();
    if (error || !data) throw new Error("Email o contraseña incorrectos");
    if (!data.activo) throw new Error("Usuario desactivado");
    const session = { id: data.id, email: data.email, nombre: data.nombre, rol: data.rol, tenantId: data.tenant_id || "habitaris", ts: Date.now() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    sb.from("users").update({ last_login: new Date().toISOString() }).eq("id", data.id).then(() => {});
    return session;
  },
  get session() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (Date.now() - s.ts > SESSION_TTL) { sessionStorage.removeItem(SESSION_KEY); return null; }
      return s;
    } catch { return null; }
  },
  get isLoggedIn() { return this.session !== null; },
  get role() { return this.session?.rol || "usuario"; },
  get tenantId() { return this.session?.tenantId || "habitaris"; },
  logout() { sessionStorage.removeItem(SESSION_KEY); }
};
export default auth;
