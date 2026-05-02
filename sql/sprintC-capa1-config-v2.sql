-- =============================================================================
-- Habitaris Suite — Sprint C Capa 1 v2: Ajustado a estructura existente
-- =============================================================================
-- Cambios respecto a v1:
--   - country_configs YA existe con cols: pais, nombre, divisa_default,
--     idioma_default, config, created_at. Se MANTIENEN (4 modulos las leen).
--   - Solo se AÑADEN columnas nuevas: flag_emoji, phone_code, default_locale,
--     default_timezone, updated_at.
--   - Las filas CO y ES ya existen (vacias). Se hace UPDATE, no INSERT.
-- =============================================================================


-- 1) AMPLIAR companies (las 4 que faltaron en v1)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS domicilio_legal JSONB DEFAULT '{}'::jsonb;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_representative JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_override JSONB;

COMMENT ON COLUMN companies.tax_id IS 'NIT/CIF/RFC. Se sustituye en plantillas legales.';
COMMENT ON COLUMN companies.domicilio_legal IS 'JSON: { ciudad, departamento, direccion, codigo_postal, pais }';
COMMENT ON COLUMN companies.phone IS 'Telefono principal de la empresa.';
COMMENT ON COLUMN companies.legal_representative IS 'JSON: { name, cargo, email, document_type, document_number }. NULL = hereda del tenant.';
COMMENT ON COLUMN companies.branding_override IS 'JSON branding propio. NULL = hereda del tenant.';


-- 2) AMPLIAR country_configs (sin tocar columnas existentes)
ALTER TABLE country_configs ADD COLUMN IF NOT EXISTS flag_emoji TEXT;
ALTER TABLE country_configs ADD COLUMN IF NOT EXISTS phone_code TEXT;
ALTER TABLE country_configs ADD COLUMN IF NOT EXISTS default_locale TEXT;
ALTER TABLE country_configs ADD COLUMN IF NOT EXISTS default_timezone TEXT;
ALTER TABLE country_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- 3.1) Colombia: enriquecer (UPDATE, ya existe)
UPDATE country_configs
SET
  flag_emoji        = '🇨🇴',
  phone_code        = '+57',
  default_locale    = 'es-CO',
  default_timezone  = 'America/Bogota',
  config            = '{
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
  }'::jsonb,
  updated_at = NOW()
WHERE pais = 'CO';


-- 3.2) España: enriquecer (UPDATE, ya existe)
UPDATE country_configs
SET
  flag_emoji        = '🇪🇸',
  phone_code        = '+34',
  default_locale    = 'es-ES',
  default_timezone  = 'Europe/Madrid',
  config            = '{
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
  }'::jsonb,
  updated_at = NOW()
WHERE pais = 'ES';


-- 3.3) Tenant Habitaris: rellenar tenant_config con la estructura completa.
DO $$
DECLARE
  current_config JSONB;
  new_config JSONB;
BEGIN
  SELECT config INTO current_config FROM tenant_config WHERE tenant_id = 'habitaris';
  IF current_config IS NULL THEN current_config := '{}'::jsonb; END IF;

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
      'logo_white_url',      '/logo-habitaris-blanco.jpg',
      'logo_black_url',      '/logo-habitaris-negro.svg',
      'logo_pdf_base64',     NULL,
      'color_primary',       '#111111',
      'color_secondary',     '#3B3B3B',
      'color_accent',        '#1E6B42',
      'color_success',       '#10B981',
      'color_warning',       '#D97706',
      'color_danger',        '#B91C1C',
      'font_family_primary', 'DM Sans',
      'font_family_mono',    'DM Mono'
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
  || (current_config - 'identity' - 'urls' - 'contact' - 'branding' - 'defaults' - 'default_legal_representative');

  INSERT INTO tenant_config (tenant_id, config)
  VALUES ('habitaris', new_config)
  ON CONFLICT (tenant_id) DO UPDATE SET config = new_config;
END $$;


-- 3.4) Empresa(s) Habitaris: rellenar campos legales si vacios
UPDATE companies
SET
  tax_id              = COALESCE(NULLIF(tax_id, ''), '901.922.136-8'),
  phone               = COALESCE(NULLIF(phone, ''), '+57 350 566 1545'),
  domicilio_legal     = CASE
                          WHEN domicilio_legal IS NULL OR domicilio_legal = '{}'::jsonb
                          THEN '{"ciudad":"Bogotá D.C.","departamento":"Bogotá D.C.","direccion":"","codigo_postal":"","pais":"CO"}'::jsonb
                          ELSE domicilio_legal
                        END,
  legal_representative = CASE
                           WHEN legal_representative IS NULL
                           THEN '{"name":"Ana María Díaz Buitrago","cargo":"Directora Creativa y Diseño","email":"amdiaz@habitaris.es","document_type":"CC","document_number":"1.109.293.384"}'::jsonb
                           ELSE legal_representative
                         END
WHERE tenant_id = 'habitaris'
  AND pais = 'CO'
  AND (legal_name ILIKE '%habitaris%' OR display_name ILIKE '%habitaris%');


-- VERIFICACION FINAL
DO $$
DECLARE
  cnt_country INT;
  cnt_company INT;
  has_tenant_config BOOLEAN;
  co_size INT;
BEGIN
  SELECT COUNT(*) INTO cnt_country FROM country_configs WHERE pais IN ('CO','ES') AND length(config::text) > 100;
  SELECT COUNT(*) INTO cnt_company FROM companies WHERE tax_id IS NOT NULL AND tenant_id = 'habitaris';
  SELECT length(config::text) INTO co_size FROM country_configs WHERE pais = 'CO';
  SELECT EXISTS(
    SELECT 1 FROM tenant_config
     WHERE tenant_id = 'habitaris'
       AND config ? 'identity'
       AND config ? 'urls'
       AND config ? 'contact'
       AND config ? 'branding'
  ) INTO has_tenant_config;

  RAISE NOTICE '--- VERIFICACION ---';
  RAISE NOTICE 'country_configs enriquecidos:    % filas (esperado: 2)', cnt_country;
  RAISE NOTICE 'config Colombia size:            % chars (esperado: ~3000+)', co_size;
  RAISE NOTICE 'companies con tax_id:            % filas (esperado: >=1)', cnt_company;
  RAISE NOTICE 'tenant_config completo:          % (esperado: true)', has_tenant_config;
  RAISE NOTICE '--- FIN ---';
  IF cnt_country = 2 AND cnt_company >= 1 AND has_tenant_config THEN
    RAISE NOTICE 'OK Sprint C Capa 1 aplicado correctamente.';
  ELSE
    RAISE WARNING 'Algo no quedo como se esperaba. Revisar arriba.';
  END IF;
END $$;
