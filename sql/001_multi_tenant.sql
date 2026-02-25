-- ═══════════════════════════════════════════════════════════
-- HABITARIS SUITE — MIGRACIÓN MULTI-TENANT
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Tabla de tenants
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  plan TEXT DEFAULT 'trial' CHECK (plan IN ('trial','starter','pro','enterprise')),
  modulos_activos TEXT[] DEFAULT ARRAY['crm','formularios'],
  max_usuarios INTEGER DEFAULT 3,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habitaris como primer tenant
INSERT INTO tenants (id, nombre, nit, plan, modulos_activos, max_usuarios)
VALUES ('habitaris', 'Habitaris S.A.S', '901.922.136-8', 'enterprise',
  ARRAY['crm','formularios','rrhh','logistica','proyectos','dashboard',
    'aprobaciones','calidad','contabilidad','sst','biblioteca','postventa',
    'formacion','identidad','firma','legal','administracion','flotas',
    'compras','herramientas','configuracion'], 50)
ON CONFLICT (id) DO NOTHING;

-- 3. tenant_id en kv_store
ALTER TABLE kv_store ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'habitaris';
UPDATE kv_store SET tenant_id = 'habitaris' WHERE tenant_id IS NULL;

-- 4. Nueva PK compuesta
ALTER TABLE kv_store DROP CONSTRAINT IF EXISTS kv_store_pkey;
ALTER TABLE kv_store ADD PRIMARY KEY (tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_kv_tenant ON kv_store(tenant_id);

-- 5. tenant_id en users
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'habitaris';
UPDATE users SET tenant_id = 'habitaris' WHERE tenant_id IS NULL;

-- 6. RLS
ALTER TABLE kv_store ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_kv_access ON kv_store;
CREATE POLICY tenant_kv_access ON kv_store FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_read ON tenants;
CREATE POLICY tenant_read ON tenants FOR SELECT USING (true);

-- Verificar:
-- SELECT * FROM tenants;
-- SELECT tenant_id, key, left(value::text, 50) FROM kv_store LIMIT 20;
