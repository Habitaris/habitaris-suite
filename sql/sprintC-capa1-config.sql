-- =============================================================================
-- Habitaris Suite — Sprint C Capa 1: Migración de configuración
-- Fecha: 2 mayo 2026
-- =============================================================================
--
-- Este script hace tres cosas:
--   1. Amplía la tabla `companies` con datos legales (tax_id, domicilio, phone,
--      legal_representative, branding_override).
--   2. Crea la tabla nueva `country_configs` (catálogo maestro por país).
--   3. Inserta el SEEDER con los valores actuales hardcoded del proyecto
--      (Habitaris S.A.S., Colombia con SMLMV 2026, ARL niveles, textos legales).
--
-- IMPORTANTE:
--   - Es IDEMPOTENTE: se puede ejecutar varias veces sin romper nada.
--   - NO borra ni transforma datos existentes.
--   - NO toca la tabla `tenants` ni el contenido de `tenant_config.config`
--     existente (el siguiente bloque opcional sí lo enriquece, pero solo si
--     está vacío).
--
-- Cómo ejecutarlo:
--   1. Abrir Supabase SQL Editor:
--      https://supabase.com/dashboard/project/xlzkasdskatnikuavefh/sql/new
--   2. Pegar TODO el contenido de este archivo.
--   3. Pulsar "Run".
--   4. Verificar que las 3 secciones acaban con NOTICE/comentario de éxito.
-- =============================================================================


-- =============================================================================
-- 1) AMPLIACIÓN DE TABLA `companies`
-- =============================================================================

-- tax_id: NIT en CO, CIF en ES, RFC en MX, etc. Reemplaza al hardcoded.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Dirección legal estructurada (no solo "Bogotá D.C." en texto plano).
-- Estructura JSONB esperada:
--   { "ciudad": "Bogotá D.C.", "departamento": "Bogotá D.C.",
--     "direccion": "Calle 106 #45-39", "codigo_postal": "110121", "pais": "CO" }
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS domicilio_legal JSONB DEFAULT '{}'::jsonb;

-- Teléfono principal de la empresa (puede diferir del del holding).
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Representante legal por empresa. Si NULL, hereda del default del tenant.
-- Estructura: { "name": "...", "cargo": "...", "email": "...",
--               "document_type": "CC", "document_number": "..." }
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS legal_representative JSONB;

-- Branding override por empresa (UTEs y futuras marcas blancas).
-- Si NULL, hereda del tenant. Misma estructura que tenant_config.config.branding.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS branding_override JSONB;

-- Comentarios documentando el propósito de cada campo.
COMMENT ON COLUMN companies.tax_id IS 'Identificador fiscal (NIT en CO, CIF en ES, RFC en MX). Se sustituye en plantillas legales.';
COMMENT ON COLUMN companies.domicilio_legal IS 'Domicilio legal estructurado: { ciudad, departamento, direccion, codigo_postal, pais }. Se sustituye en plantillas.';
COMMENT ON COLUMN companies.phone IS 'Teléfono principal de la empresa. Diferente del primary_phone del holding.';
COMMENT ON COLUMN companies.legal_representative IS 'Representante legal: { name, cargo, email, document_type, document_number }. Si NULL hereda del tenant.';
COMMENT ON COLUMN companies.branding_override IS 'Branding propio de la empresa (logos, colores). Si NULL hereda del tenant.';


-- =============================================================================
-- 2) TABLA NUEVA `country_configs` (catálogo maestro por país)
-- =============================================================================

CREATE TABLE IF NOT EXISTS country_configs (
  code TEXT PRIMARY KEY,                  -- "CO", "ES", "MX", ...
  name TEXT NOT NULL,                     -- "Colombia"
  flag_emoji TEXT,                        -- "🇨🇴"
  phone_code TEXT,                        -- "+57"
  default_locale TEXT NOT NULL,           -- "es-CO"
  default_currency TEXT NOT NULL,         -- "COP"
  default_timezone TEXT NOT NULL,         -- "America/Bogota"
  config JSONB DEFAULT '{}'::jsonb,       -- legal_constants, arl_levels, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE country_configs IS 'Catálogo maestro de configuración por país. Una fila por código ISO.';
COMMENT ON COLUMN country_configs.config IS 'JSON con: legal_constants (smlmv, aux_transporte, uvt, horas_mensuales_legal), arl_levels[], normative_refs[], departamentos[], compliance_urls{}, legal_text_templates{} (privacy_notice, habeas_data, confirmation).';


-- =============================================================================
-- 3) SEEDER — datos actuales del proyecto
-- =============================================================================

-- 3.1 Colombia: catálogo completo (constantes 2026, ARL, textos legales)
INSERT INTO country_configs (code, name, flag_emoji, phone_code, default_locale, default_currency, default_timezone, config)
VALUES (
  'CO',
  'Colombia',
  '🇨🇴',
  '+57',
  'es-CO',
  'COP',
  'America/Bogota',
  '{
    "legal_constants": {
      "smlmv":              { "value": 1750905, "valid_from": "2026-01-01", "currency": "COP" },
      "aux_transporte":     { "value": 249095,  "valid_from": "2026-01-01", "currency": "COP" },
      "uvt":                { "value": 49799,   "valid_from": "2026-01-01", "currency": "COP" },
      "horas_mensuales_legal": 220
    },
    "arl_levels": [
      { "nivel": "I",   "percent": 0.522, "label": "Mínimo" },
      { "nivel": "II",  "percent": 1.044, "label": "Bajo" },
      { "nivel": "III", "percent": 2.436, "label": "Medio" },
      { "nivel": "IV",  "percent": 4.350, "label": "Alto" },
      { "nivel": "V",   "percent": 6.960, "label": "Máximo" }
    ],
    "normative_refs": [
      { "ley": "Ley 1581/2012",   "desc": "Habeas Data — protección de datos personales" },
      { "ley": "Decreto 1377/2013", "desc": "Reglamento de Habeas Data" },
      { "ley": "Ley 50/1990",     "desc": "Reforma laboral, prima, cesantías" },
      { "ley": "Ley 100/1993",    "desc": "Sistema de seguridad social integral" }
    ],
    "departamentos": [
      "Amazonas","Antioquia","Arauca","Atlántico","Bogotá D.C.","Bolívar",
      "Boyacá","Caldas","Caquetá","Casanare","Cauca","Cesar","Chocó","Córdoba",
      "Cundinamarca","Guainía","Guaviare","Huila","La Guajira","Magdalena",
      "Meta","Nariño","Norte de Santander","Putumayo","Quindío","Risaralda",
      "San Andrés y Providencia","Santander","Sucre","Tolima","Valle del Cauca",
      "Vaupés","Vichada"
    ],
    "compliance_urls": {
      "antecedentes_policia":     "https://antecedentes.policia.gov.co:7005/WebJudicial/",
      "antecedentes_procuraduria":"https://www.procuraduria.gov.co/Pages/Consulta-de-Antecedentes.aspx",
      "antecedentes_contraloria": "https://www.contraloria.gov.co/control-fiscal/responsabilidad-fiscal/certificado-de-antecedentes-fiscales"
    },
    "legal_text_templates": {
      "privacy_notice": "En {{razon_social}} (NIT {{tax_id}}, domicilio {{domicilio}}, email: {{primary_email}}, tel: {{primary_phone}}), tratamos tus datos personales para procesar tu solicitud, enviar cotizaciones y gestionar proyectos. Cumplimos con la Ley 1581/2012 y Régimen de Protección de Datos. Derechos (acceso, rectificación, supresión, revocación): vía {{primary_email}}.",
      "habeas_data": "Al enviar este formulario autorizo a {{razon_social}}, para el uso de mis datos personales con el fin de elaborar propuestas de diseño, coordinar servicios relacionados y, en caso de ser necesario, compartirlos con proveedores o contratistas de confianza exclusivamente para la correcta ejecución del proyecto. En todo momento se garantizará la confidencialidad y protección de mi información, conforme a la normativa de Habeas Data en Colombia (Ley 1581 de 2012).",
      "confirmation": "La información entregada es verídica y será utilizada únicamente para la elaboración de la propuesta de diseño. {{razon_social}} garantiza la confidencialidad de los datos y no los compartirá con terceros, salvo con proveedores o contratistas de confianza cuando sea necesario para la correcta ejecución del proyecto, previa autorización del cliente."
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  flag_emoji       = EXCLUDED.flag_emoji,
  phone_code       = EXCLUDED.phone_code,
  default_locale   = EXCLUDED.default_locale,
  default_currency = EXCLUDED.default_currency,
  default_timezone = EXCLUDED.default_timezone,
  config           = EXCLUDED.config,
  updated_at       = NOW();


-- 3.2 España: estructura mínima (ampliar cuando se abra país)
INSERT INTO country_configs (code, name, flag_emoji, phone_code, default_locale, default_currency, default_timezone, config)
VALUES (
  'ES',
  'España',
  '🇪🇸',
  '+34',
  'es-ES',
  'EUR',
  'Europe/Madrid',
  '{
    "legal_constants": {
      "smi": { "value": 1184, "valid_from": "2026-01-01", "currency": "EUR" },
      "horas_mensuales_legal": 173.33
    },
    "normative_refs": [
      { "ley": "RGPD (UE) 2016/679", "desc": "Reglamento General de Protección de Datos" },
      { "ley": "LOPDGDD 3/2018",     "desc": "Ley Orgánica de Protección de Datos" },
      { "ley": "ET (RDL 2/2015)",    "desc": "Estatuto de los Trabajadores" }
    ],
    "departamentos": [],
    "compliance_urls": {},
    "legal_text_templates": {
      "privacy_notice": "En {{razon_social}} (CIF {{tax_id}}, domicilio {{domicilio}}, email: {{primary_email}}, tel: {{primary_phone}}), tratamos tus datos personales conforme al RGPD y la LOPDGDD. Derechos: acceso, rectificación, supresión, oposición, portabilidad y limitación, vía {{primary_email}}.",
      "habeas_data": "",
      "confirmation": ""
    }
  }'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  flag_emoji       = EXCLUDED.flag_emoji,
  phone_code       = EXCLUDED.phone_code,
  default_locale   = EXCLUDED.default_locale,
  default_currency = EXCLUDED.default_currency,
  default_timezone = EXCLUDED.default_timezone,
  config           = EXCLUDED.config,
  updated_at       = NOW();


-- 3.3 Tenant Habitaris: rellenar tenant_config.config con la estructura completa.
-- Se hace MERGE para no destruir lo que ya esté guardado (country_default,
-- currency_default, etc. del Bloque 3a Sprint B).
DO $$
DECLARE
  current_config JSONB;
  new_config JSONB;
BEGIN
  -- Leer config actual
  SELECT config INTO current_config FROM tenant_config WHERE tenant_id = 'habitaris';
  IF current_config IS NULL THEN current_config := '{}'::jsonb; END IF;

  -- Construir nueva config preservando lo que exista
  new_config := jsonb_build_object(
    'identity', COALESCE(current_config->'identity', jsonb_build_object(
      'display_name', 'Habitaris',
      'legal_name',   'Habitaris S.A.S.',
      'tagline',      'Diseño · Interiorismo · Arquitectura'
    )),
    'urls', COALESCE(current_config->'urls', jsonb_build_object(
      'app',            'https://suite.habitaris.es',
      'public_website', 'https://www.habitaris.es'
    )),
    'contact', COALESCE(current_config->'contact', jsonb_build_object(
      'primary_email', 'comercial@habitaris.es',
      'noreply_email', 'noreply@habitaris.es',
      'legal_email',   'legal@habitaris.es',
      'primary_phone', '+57 350 566 1545'
    )),
    'branding', COALESCE(current_config->'branding', jsonb_build_object(
      'logo_white_url',     '/logo-habitaris-blanco.jpg',
      'logo_black_url',     '/logo-habitaris-negro.svg',
      'logo_pdf_base64',    NULL,
      'color_primary',      '#111111',
      'color_secondary',    '#3B3B3B',
      'color_accent',       '#1E6B42',
      'color_success',      '#10B981',
      'color_warning',      '#D97706',
      'color_danger',       '#B91C1C',
      'font_family_primary','DM Sans',
      'font_family_mono',   'DM Mono'
    )),
    'defaults', COALESCE(current_config->'defaults', jsonb_build_object(
      'country',  COALESCE(current_config->>'country_default',  'CO'),
      'locale',   COALESCE(current_config->>'language_default', 'es-CO'),
      'currency', COALESCE(current_config->>'currency_default', 'COP'),
      'timezone', COALESCE(current_config->>'timezone_default', 'America/Bogota')
    )),
    'default_legal_representative', COALESCE(current_config->'default_legal_representative', jsonb_build_object(
      'name',            'Ana María Díaz Buitrago',
      'cargo',           'Directora Creativa y Diseño',
      'email',           'amdiaz@habitaris.es',
      'document_type',   'CC',
      'document_number', '1.109.293.384'
    ))
  )
  -- Mantener cualquier otra key que estuviera en current_config
  || (current_config - 'identity' - 'urls' - 'contact' - 'branding' - 'defaults' - 'default_legal_representative');

  -- Upsert
  INSERT INTO tenant_config (tenant_id, config)
  VALUES ('habitaris', new_config)
  ON CONFLICT (tenant_id) DO UPDATE SET config = new_config;
END $$;


-- 3.4 Empresa Habitaris S.A.S.: rellenar campos legales.
-- Asumimos que existe una company del tenant 'habitaris' que es la principal.
-- Solo se actualiza si los campos están vacíos (NULL o '').
UPDATE companies
SET
  tax_id              = COALESCE(NULLIF(tax_id, ''), '901.922.136-8'),
  phone               = COALESCE(NULLIF(phone, ''), '+57 350 566 1545'),
  domicilio_legal     = CASE
                          WHEN domicilio_legal IS NULL OR domicilio_legal = '{}'::jsonb
                          THEN '{
                                 "ciudad": "Bogotá D.C.",
                                 "departamento": "Bogotá D.C.",
                                 "direccion": "",
                                 "codigo_postal": "",
                                 "pais": "CO"
                                }'::jsonb
                          ELSE domicilio_legal
                        END,
  legal_representative = CASE
                           WHEN legal_representative IS NULL
                           THEN '{
                                  "name": "Ana María Díaz Buitrago",
                                  "cargo": "Directora Creativa y Diseño",
                                  "email": "amdiaz@habitaris.es",
                                  "document_type": "CC",
                                  "document_number": "1.109.293.384"
                                 }'::jsonb
                           ELSE legal_representative
                         END
WHERE tenant_id = 'habitaris'
  AND pais = 'CO'
  AND (legal_name ILIKE '%habitaris%' OR display_name ILIKE '%habitaris%');


-- =============================================================================
-- VERIFICACIÓN FINAL
-- =============================================================================

DO $$
DECLARE
  cnt_country INT;
  cnt_company INT;
  has_tenant_config BOOLEAN;
BEGIN
  SELECT COUNT(*) INTO cnt_country FROM country_configs WHERE code IN ('CO','ES');
  SELECT COUNT(*) INTO cnt_company FROM companies WHERE tax_id IS NOT NULL AND tenant_id = 'habitaris';
  SELECT EXISTS(
    SELECT 1 FROM tenant_config
     WHERE tenant_id = 'habitaris'
       AND config ? 'identity'
       AND config ? 'urls'
       AND config ? 'contact'
       AND config ? 'branding'
  ) INTO has_tenant_config;

  RAISE NOTICE '─── VERIFICACIÓN ───';
  RAISE NOTICE 'country_configs (CO+ES):    % filas (esperado: 2)', cnt_country;
  RAISE NOTICE 'companies con tax_id:        % filas (esperado: ≥1)', cnt_company;
  RAISE NOTICE 'tenant_config completo:      % (esperado: true)', has_tenant_config;
  RAISE NOTICE '─── FIN ───';
  IF cnt_country = 2 AND cnt_company >= 1 AND has_tenant_config THEN
    RAISE NOTICE '✓ Sprint C Capa 1 aplicado correctamente.';
  ELSE
    RAISE WARNING '⚠ Algo no quedó como se esperaba. Revisar arriba.';
  END IF;
END $$;
