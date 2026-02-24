/**
 * ═══════════════════════════════════════════════════════════════
 * HABITARIS API LAYER
 * ═══════════════════════════════════════════════════════════════
 * 
 * Capa de abstracción para datos persistentes.
 * 
 * MODO ACTUAL:  window.storage (Anthropic / desarrollo local)
 * MODO FUTURO:  Supabase (producción en suite.habitaris.com)
 * 
 * Para migrar a Supabase, solo se reemplaza este archivo.
 * El resto de la app NO cambia.
 * ═══════════════════════════════════════════════════════════════
 */

// ── CONFIG ──────────────────────────────────────────────────
const MODE = "local"; // "local" | "supabase"
// const SUPABASE_URL = "https://xxx.supabase.co";
// const SUPABASE_ANON = "eyJ...";

// ── HELPERS ─────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
const now = () => new Date().toISOString();
const today = () => now().split("T")[0];

// ── LOCAL STORAGE (window.storage) ──────────────────────────
const local = {
  async get(key) {
    try {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      await window.storage.set(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },
  async del(key) {
    try {
      await window.storage.delete(key);
      return true;
    } catch { return false; }
  },
  async list(prefix) {
    try {
      const r = await window.storage.list(prefix);
      return r?.keys || [];
    } catch { return []; }
  },
  // Shared storage (portal público)
  async getShared(key) {
    try {
      const r = await window.storage.get(key, true);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async setShared(key, value) {
    try {
      await window.storage.set(key, JSON.stringify(value), true);
      return true;
    } catch { return false; }
  },
};

// ── SUPABASE STORAGE (futuro) ───────────────────────────────
// const supabase = { ... }; // Se implementa en migración

// ── ACTIVE BACKEND ──────────────────────────────────────────
const db = MODE === "supabase" ? null /* supabase */ : local;

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * ── USUARIOS INTERNOS ──
 * Personas que pueden elaborar, aprobar, firmar ofertas.
 */
export const USUARIOS_INTERNOS = [
  {
    id: "david",
    nombre: "David Parra Galera",
    cargo: "Director Ejecutivo y de Producción",
    email: "david@habitaris.com",
    rol: "admin",
    puedeAprobar: true,
    puedeFirmar: true,
  },
  {
    id: "ana",
    nombre: "Ana María Díaz Buitrago",
    cargo: "Directora Creativa y de Diseño",
    email: "ana@habitaris.com",
    rol: "admin",
    puedeAprobar: true,
    puedeFirmar: true,
  },
];

/**
 * Determina quién aprueba según quién elaboró
 */
export function getAprobador(elaboradoPorId) {
  if (elaboradoPorId === "david") return USUARIOS_INTERNOS.find(u => u.id === "ana");
  if (elaboradoPorId === "ana") return USUARIOS_INTERNOS.find(u => u.id === "david");
  // Si elaboró otro, aprueba quien firma
  return null; // se determina por firmaRepresentante
}

// ── OFERTAS ─────────────────────────────────────────────────
const NS_OFERTAS = "hab:crm:ofertas";

export const ofertas = {
  async getAll() {
    return await db.get(NS_OFERTAS) || [];
  },
  async save(oferta) {
    const all = await this.getAll();
    const idx = all.findIndex(o => o.id === oferta.id);
    if (idx >= 0) all[idx] = oferta; else all.push(oferta);
    await db.set(NS_OFERTAS, all);
    return oferta;
  },
  async delete(id) {
    const all = await this.getAll();
    await db.set(NS_OFERTAS, all.filter(o => o.id !== id));
  },
};

// ── APROBACIONES ────────────────────────────────────────────
const NS_APROBACIONES = "hab:crm:aprobaciones";

/**
 * Estructura de una aprobación:
 * {
 *   id, ofertaId, tipo: "interna"|"cliente",
 *   revision: 0,
 *   accion: "solicitar"|"aprobar"|"rechazar"|"devolver"|"enviar",
 *   por: { id, nombre, cargo },
 *   fecha: ISO,
 *   comentarios: "",
 *   metadata: {} // datos extra según acción
 * }
 */
export const aprobaciones = {
  async getAll() {
    return await db.get(NS_APROBACIONES) || [];
  },
  async getByOferta(ofertaId) {
    const all = await this.getAll();
    return all.filter(a => a.ofertaId === ofertaId).sort((a, b) => a.fecha > b.fecha ? 1 : -1);
  },
  async add(entry) {
    const all = await this.getAll();
    const nuevo = { id: uid(), fecha: now(), ...entry };
    all.push(nuevo);
    await db.set(NS_APROBACIONES, all);
    return nuevo;
  },
  async getLastByOferta(ofertaId) {
    const hist = await this.getByOferta(ofertaId);
    return hist.length > 0 ? hist[hist.length - 1] : null;
  },
};

// ── PORTAL CLIENTE ──────────────────────────────────────────
const NS_PORTAL = "hab:portal";

/**
 * Estructura de un portal:
 * {
 *   token: "abc123",
 *   ofertaId, revision,
 *   clienteEmail, clienteNombre,
 *   fechaCreacion: ISO,
 *   fechaExpiracion: ISO (20 días),
 *   estado: "pendiente"|"aprobada"|"rechazada"|"devuelta",
 *   respuestas: [{ fecha, accion, comentarios, por }],
 *   datosOferta: { ... snapshot del documento }
 * }
 */
export const portal = {
  _tokenKey(token) { return `${NS_PORTAL}:${token}`; },

  async crear(ofertaId, datosOferta, revision = 0) {
    const token = uid() + uid(); // token largo único
    const entry = {
      token,
      ofertaId,
      revision,
      clienteEmail: datosOferta.emailCliente || "",
      clienteNombre: datosOferta.cliente || "",
      fechaCreacion: now(),
      fechaExpiracion: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      estado: "pendiente",
      respuestas: [],
      datosOferta: {
        titulo: datosOferta.ent_titulo || (datosOferta.tipoProyecto === "OBRA" ? "PRESUPUESTO DE EJECUCIÓN" : "PROPUESTA DE DISEÑO"),
        ref: datosOferta.codigoOferta || "",
        cliente: datosOferta.cliente || "",
        proyecto: datosOferta.proyecto || "",
        ubicacion: datosOferta.ubicacion || "",
        fecha: datosOferta.fechaOferta || today(),
        pvp: datosOferta._pvp || 0,
        pvpIva: datosOferta._pvpIva || 0,
        iva: datosOferta._iva || 0,
        divisa: datosOferta.divisa || "COP",
        alcance: datosOferta.ent_alcance || "",
        fases: datosOferta.ent_fases || "",
        exclusiones: datosOferta.ent_exclusiones || "",
        condPago: datosOferta.ent_condPago || "",
        plazo: datosOferta.ent_plazo || "",
        garantias: datosOferta.ent_garantias || "",
        terminos: datosOferta.ent_terminos || "",
        notaLegal: datosOferta.ent_notaLegal || "",
        presupuesto: datosOferta.borradorLineas || [],
        nivelDetalle: datosOferta.ent_nivelDetalle || "capitulos",
        firmante: datosOferta.firmaRepresentante || "David Parra Galera",
      },
    };
    // Guardar en shared storage (accesible sin auth)
    await db.setShared(this._tokenKey(token), entry);
    // También guardar índice local
    const idx = await db.get(`${NS_PORTAL}:index`) || [];
    idx.push({ token, ofertaId, revision, fecha: entry.fechaCreacion, estado: "pendiente" });
    await db.set(`${NS_PORTAL}:index`, idx);
    return entry;
  },

  async getByToken(token) {
    return await db.getShared(this._tokenKey(token));
  },

  async responder(token, accion, comentarios = "", por = "") {
    const entry = await this.getByToken(token);
    if (!entry) return null;
    entry.respuestas.push({ fecha: now(), accion, comentarios, por: por || entry.clienteNombre });
    entry.estado = accion; // "aprobada"|"rechazada"|"devuelta"
    await db.setShared(this._tokenKey(token), entry);
    // Actualizar índice local
    const idx = await db.get(`${NS_PORTAL}:index`) || [];
    const i = idx.find(x => x.token === token);
    if (i) { i.estado = accion; await db.set(`${NS_PORTAL}:index`, idx); }
    return entry;
  },

  async getIndex() {
    return await db.get(`${NS_PORTAL}:index`) || [];
  },

  async getByOferta(ofertaId) {
    const idx = await this.getIndex();
    const tokens = idx.filter(x => x.ofertaId === ofertaId);
    const results = [];
    for (const t of tokens) {
      const p = await this.getByToken(t.token);
      if (p) results.push(p);
    }
    return results;
  },
};

// ── NOTIFICACIONES (preparado para email/push) ──────────────
const NS_NOTIF = "hab:notificaciones";

export const notificaciones = {
  async add(notif) {
    const all = await db.get(NS_NOTIF) || [];
    all.push({ id: uid(), fecha: now(), leida: false, ...notif });
    await db.set(NS_NOTIF, all);
  },
  async getAll() {
    return await db.get(NS_NOTIF) || [];
  },
  async getNoLeidas() {
    const all = await this.getAll();
    return all.filter(n => !n.leida);
  },
  async marcarLeida(id) {
    const all = await this.getAll();
    const n = all.find(x => x.id === id);
    if (n) { n.leida = true; await db.set(NS_NOTIF, all); }
  },
};

// ── EXPORT DEFAULT ──────────────────────────────────────────
export default {
  uid, now, today,
  db,
  USUARIOS_INTERNOS,
  getAprobador,
  ofertas,
  aprobaciones,
  portal,
  notificaciones,
};
