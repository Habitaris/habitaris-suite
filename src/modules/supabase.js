/* ═══════════════════════════════════════════════════════════════
   SUPABASE HELPER — Habitaris Suite
   Comunicación con Supabase REST API sin SDK (lightweight)
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "habitaris_config";

/* Fallback credentials (always available) */
const FALLBACK_URL = "https://xlzkasdskatnikuavefh.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsemthc2Rza2F0bmlrdWF2ZWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4OTE3NzQsImV4cCI6MjA4NzQ2Nzc3NH0.SR9tIpvL0YnV9CNrRq4T-xetifuNQOJZE0OnQpwtYLM";

function getSupaConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cfg = JSON.parse(raw);
      const url = (cfg.supabase?.url || "").replace(/\/$/,"");
      const key = cfg.supabase?.anonKey || "";
      if (url && key) return { url, key };
    }
    // Fallback to hardcoded credentials
    return { url: FALLBACK_URL, key: FALLBACK_KEY };
  } catch { return { url: FALLBACK_URL, key: FALLBACK_KEY }; }
}

function headers(key) {
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation",
  };
}

/* ── Generic REST calls ── */
async function query(table, params = "") {
  const c = getSupaConfig();
  if (!c) return null;
  try {
    const res = await fetch(`${c.url}/rest/v1/${table}?${params}`, { headers: headers(c.key) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function insert(table, data) {
  const c = getSupaConfig();
  if (!c) return null;
  try {
    const res = await fetch(`${c.url}/rest/v1/${table}`, {
      method: "POST",
      headers: headers(c.key),
      body: JSON.stringify(data),
    });
    if (!res.ok) { console.warn("Supabase insert error:", res.status); return null; }
    return await res.json();
  } catch(e) { console.warn("Supabase insert error:", e); return null; }
}

async function update(table, match, data) {
  const c = getSupaConfig();
  if (!c) return null;
  try {
    const res = await fetch(`${c.url}/rest/v1/${table}?${match}`, {
      method: "PATCH",
      headers: headers(c.key),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function rpc(fn, params = {}) {
  const c = getSupaConfig();
  if (!c) return null;
  try {
    const res = await fetch(`${c.url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: headers(c.key),
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/* ══════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════ */

/* ── Test connection ── */
export async function testConnection() {
  const c = getSupaConfig();
  if (!c) return { ok: false, error: "URL o clave no configuradas" };
  try {
    const res = await fetch(`${c.url}/rest/v1/`, { headers: headers(c.key) });
    if (res.ok) return { ok: true };
    return { ok: false, error: `Error HTTP ${res.status}` };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

/* ── Create tables via SQL (run once) ── */
export async function createTables() {
  const c = getSupaConfig();
  if (!c) return { ok: false, error: "Configura Supabase primero" };

  const sql = `
    -- Form events (opens, views, time tracking)
    CREATE TABLE IF NOT EXISTS form_events (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      form_id TEXT NOT NULL,
      form_name TEXT,
      event_type TEXT NOT NULL DEFAULT 'open',
      link_id TEXT,
      client_name TEXT,
      client_email TEXT,
      duration_seconds INTEGER DEFAULT 0,
      user_agent TEXT,
      ip TEXT,
      metadata JSONB DEFAULT '{}'
    );

    -- Form responses (actual submitted data)
    CREATE TABLE IF NOT EXISTS form_responses (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      form_id TEXT NOT NULL,
      form_name TEXT,
      link_id TEXT,
      client_name TEXT,
      client_email TEXT,
      client_tel TEXT,
      module TEXT DEFAULT 'general',
      data JSONB DEFAULT '{}',
      processed BOOLEAN DEFAULT false,
      processed_at TIMESTAMPTZ,
      notes TEXT
    );

    -- Form links (track each shared link)
    CREATE TABLE IF NOT EXISTS form_links (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      form_id TEXT NOT NULL,
      form_name TEXT,
      link_id TEXT UNIQUE NOT NULL,
      client_name TEXT,
      client_email TEXT,
      max_uses INTEGER DEFAULT 0,
      current_uses INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ,
      active BOOLEAN DEFAULT true
    );

    -- Enable RLS but allow anon access (simple setup)
    ALTER TABLE form_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE form_links ENABLE ROW LEVEL SECURITY;

    -- Policies: allow all for anon (single-tenant app)
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_all_events') THEN
        CREATE POLICY anon_all_events ON form_events FOR ALL TO anon USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_all_responses') THEN
        CREATE POLICY anon_all_responses ON form_responses FOR ALL TO anon USING (true) WITH CHECK (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_all_links') THEN
        CREATE POLICY anon_all_links ON form_links FOR ALL TO anon USING (true) WITH CHECK (true);
      END IF;
    END $$;
  `;

  try {
    const res = await fetch(`${c.url}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: headers(c.key),
      body: JSON.stringify({ query: sql }),
    });
    // If exec_sql RPC doesn't exist, try the SQL editor endpoint
    if (!res.ok) {
      // Fallback: try creating tables one by one via REST
      return await createTablesManual(c);
    }
    return { ok: true };
  } catch {
    return await createTablesManual(c);
  }
}

/* Fallback: create tables via Supabase Management API */
async function createTablesManual(c) {
  // We'll try to query each table — if they exist, great
  // If not, user needs to run SQL in Supabase dashboard
  const tables = ["form_events", "form_responses", "form_links"];
  const missing = [];
  for (const t of tables) {
    try {
      const res = await fetch(`${c.url}/rest/v1/${t}?select=id&limit=1`, { headers: headers(c.key) });
      if (!res.ok) missing.push(t);
    } catch { missing.push(t); }
  }
  if (missing.length === 0) return { ok: true, msg: "Tablas ya existen" };
  return {
    ok: false,
    error: "manual_sql",
    missing,
    sql: getCreateSQL(),
  };
}

export function getCreateSQL() {
  return `-- Ejecuta esto en Supabase → SQL Editor → New Query → Run

CREATE TABLE IF NOT EXISTS form_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  form_id TEXT NOT NULL,
  form_name TEXT,
  event_type TEXT NOT NULL DEFAULT 'open',
  link_id TEXT,
  client_name TEXT,
  client_email TEXT,
  duration_seconds INTEGER DEFAULT 0,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS form_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  form_id TEXT NOT NULL,
  form_name TEXT,
  link_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_tel TEXT,
  module TEXT DEFAULT 'general',
  data JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS form_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  form_id TEXT NOT NULL,
  form_name TEXT,
  link_id TEXT UNIQUE NOT NULL,
  client_name TEXT,
  client_email TEXT,
  max_uses INTEGER DEFAULT 0,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

-- Habilitar RLS
ALTER TABLE form_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_links ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY anon_all_events ON form_events FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_all_responses ON form_responses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_all_links ON form_links FOR ALL TO anon USING (true) WITH CHECK (true);
`;
}

/* ── EVENTS ── */
export async function registerOpen(formId, formName, linkId, clientName, clientEmail) {
  return insert("form_events", {
    form_id: formId,
    form_name: formName,
    event_type: "open",
    link_id: linkId || null,
    client_name: clientName || null,
    client_email: clientEmail || null,
    user_agent: navigator.userAgent || null,
  });
}

export async function registerClose(formId, linkId, durationSeconds) {
  return insert("form_events", {
    form_id: formId,
    event_type: "close",
    link_id: linkId || null,
    duration_seconds: Math.round(durationSeconds),
  });
}

export async function registerSubmit(formId, formName, linkId, clientName, clientEmail) {
  return insert("form_events", {
    form_id: formId,
    form_name: formName,
    event_type: "submit",
    link_id: linkId || null,
    client_name: clientName || null,
    client_email: clientEmail || null,
  });
}

/* ── RESPONSES ── */
export async function saveResponse(data) {
  return insert("form_responses", data);
}

export async function getResponses(formId) {
  const params = formId
    ? `form_id=eq.${formId}&order=created_at.desc`
    : "order=created_at.desc";
  return query("form_responses", params);
}

export async function getAllResponses() {
  return query("form_responses", "order=created_at.desc&limit=500");
}

export async function markProcessed(id) {
  return update("form_responses", `id=eq.${id}`, {
    processed: true,
    processed_at: new Date().toISOString(),
  });
}

export async function markUnprocessed(id) {
  return update("form_responses", `id=eq.${id}`, {
    processed: false,
    processed_at: null,
  });
}

/* ── LINKS ── */
export async function createLink(data) {
  return insert("form_links", data);
}

export async function getLink(linkId) {
  const r = await query("form_links", `link_id=eq.${linkId}&limit=1`);
  return r && r.length > 0 ? r[0] : null;
}

export async function incrementLinkUse(linkId) {
  const link = await getLink(linkId);
  if (!link) return null;
  return update("form_links", `link_id=eq.${linkId}`, {
    current_uses: (link.current_uses || 0) + 1,
  });
}

export async function getLinksForForm(formId) {
  return query("form_links", `form_id=eq.${formId}&order=created_at.desc`);
}

export async function deactivateLink(linkId) {
  return update("form_links", `link_id=eq.${linkId}`, { active: false });
}

/* ── STATS ── */
export async function activateLink(linkId) {
  return update("form_links", `link_id=eq.${linkId}`, { active: true });
}

export async function getAllLinks() {
  return query("form_links", "order=created_at.desc");
}

export async function getFormStats(formId) {
  const events = await query("form_events", `form_id=eq.${formId}&order=created_at.desc&limit=1000`);
  const responses = await query("form_responses", `form_id=eq.${formId}&order=created_at.desc`);
  const links = await query("form_links", `form_id=eq.${formId}&order=created_at.desc`);

  if (!events && !responses && !links) return null;

  const ev = events || [];
  const opens = ev.filter(e => e.event_type === "open");
  const closes = ev.filter(e => e.event_type === "close");
  const submits = ev.filter(e => e.event_type === "submit");
  const durations = closes.filter(c => c.duration_seconds > 0).map(c => c.duration_seconds);
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;

  return {
    totalOpens: opens.length,
    totalSubmits: submits.length,
    conversionRate: opens.length > 0 ? Math.round((submits.length / opens.length) * 100) : 0,
    avgDurationSec: avgDuration,
    responses: responses || [],
    links: links || [],
    events: ev,
    // Per-link breakdown
    linkStats: (links || []).map(l => ({
      ...l,
      opens: opens.filter(e => e.link_id === l.link_id).length,
      submits: submits.filter(e => e.link_id === l.link_id).length,
    })),
  };
}

export async function getAllStats() {
  const events = await query("form_events", "order=created_at.desc&limit=2000");
  const responses = await query("form_responses", "order=created_at.desc&limit=500");
  return { events: events || [], responses: responses || [] };
}

/* ── Check if Supabase is configured ── */
export function isConfigured() {
  return getSupaConfig() !== null;
}
