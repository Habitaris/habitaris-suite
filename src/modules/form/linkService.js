// ════════════════════════════════════════════════════════════════════
// LINK SERVICE — Corazón central de creación de links de formularios.
// ════════════════════════════════════════════════════════════════════
//
// Cualquier módulo que cree un link de formulario (Formularios admin,
// CRM, RRHH, SST, Compras, etc.) DEBE usar `crearFormLink()`.
//
// Aquí vive: cálculo de caducidad, upsert a form_links, disparo del email
// de invitación. Una sola fuente de verdad. Si las reglas cambian, se
// cambian aquí y todos los módulos lo heredan.
//
// Asociación módulo ↔ formulario: cada formulario lleva su campo `modulo`
// (asignado en el módulo Formularios). Los módulos consumidores filtran
// por ese campo (ver `FormulariosDelModulo.jsx`).
// ════════════════════════════════════════════════════════════════════

import { sb } from "../../core/supabase.js";

/**
 * Calcula la fecha de caducidad de un link.
 * Prioridad: fechaExacta > horasDuracion > sin caducidad.
 *
 * @param {number} horasDuracion - horas desde ahora (24/48/72/0). 0 = no aplica.
 * @param {string} fechaExacta   - "YYYY-MM-DD" o "" (tiene prioridad sobre horas).
 * @returns {string|null} ISO date string o null.
 */
export function computeExpiresAt(horasDuracion, fechaExacta) {
  if (fechaExacta) return new Date(fechaExacta).toISOString();
  const h = parseInt(horasDuracion, 10);
  if (h && h > 0) return new Date(Date.now() + h * 3600000).toISOString();
  return null;
}

/**
 * Genera un identificador único para el link.
 */
function generarLinkId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Crea un link de formulario en `form_links` y dispara el email de
 * invitación si hay email del cliente.
 *
 * Devuelve siempre un objeto: nunca lanza. Cada caller maneja su UI.
 *
 * @param {object}  args
 * @param {object}  args.form           - { id, nombre, campos, config }
 * @param {object}  args.cliente        - { nombre?, email?, tel? }
 * @param {string}  args.modulo         - "crm" | "rrhh" | "general" | etc.
 * @param {string}  args.pais           - país del proyecto (se inyecta en config.paisProyecto).
 * @param {number}  args.maxUsos        - 0 = ilimitado.
 * @param {number}  args.horasDuracion  - 24/48/72/0. 0 = no aplica por horas.
 * @param {string}  args.fechaExacta    - "YYYY-MM-DD" o "". Tiene prioridad sobre horas.
 * @param {object}  args.marca          - marca del tenant (logo, colores, etc.).
 * @param {string}  args.appUrl         - URL base para construir la URL pública.
 * @param {boolean} args.dispararEmail  - default false. Si true, llama a /api/send-email automaticamente.
 *                                         Decision producto (David, 29/04): generar el link NO dispara
 *                                         nada automatico — el usuario decide con los botones del modal.
 *
 * @returns {Promise<{ok:boolean, linkId:string|null, publicUrl:string, error?:any}>}
 */
export async function crearFormLink({
  form,
  cliente = {},
  modulo = "general",
  pais = "",
  maxUsos = 0,
  horasDuracion = 0,
  fechaExacta = "",
  marca = {},
  appUrl = "",
  dispararEmail = false,
} = {}) {
  if (!form || !form.id) {
    return { ok: false, linkId: null, publicUrl: "", error: new Error("form requerido") };
  }

  const linkId = generarLinkId();

  // Inyectar país en config sin mutar el objeto original
  const formConfig = pais
    ? { ...(form.config || {}), paisProyecto: pais }
    : (form.config || {});

  const form_def = {
    id: form.id,
    nombre: form.nombre || "Formulario",
    campos: form.campos || [],
    config: formConfig,
  };

  const expires_at = computeExpiresAt(horasDuracion, fechaExacta);

  // Si marca llega vacía, cargar branding del tenant_config (marca blanca por defecto)
  let marcaFinal = marca && Object.keys(marca).length > 0 ? marca : {};
  if (Object.keys(marcaFinal).length === 0) {
    try {
      const { data: tc } = await sb.from("tenant_config").select("config").eq("tenant_id", "habitaris").maybeSingle();
      const cfg = tc && tc.config ? tc.config : {};
      const b = cfg.branding || {};
      const ident = cfg.identity || {};
      marcaFinal = {
        logo: b.logo_white_url || "/logo-habitaris-blanco.jpg",
        empresa: ident.display_name || "Habitaris",
        colorPrimario: b.color_primary || "#111111",
        tipografia: (b.font_family || "Outfit"),
        slogan: ident.tagline || "Diseño · Interiorismo · Arquitectura",
      };
    } catch (e) { /* keep marcaFinal as {} */ }
  }

  try {
    const { error } = await sb.from("form_links").upsert({
      link_id: linkId,
      form_id: form.id,
      form_name: form.nombre || "Formulario",
      form_def,
      client_name: cliente.nombre || null,
      client_email: cliente.email || null,
      client_tel: cliente.tel || null,
      marca: marcaFinal,
      modulo: modulo || "general",
      max_uses: maxUsos || 0,
      current_uses: 0,
      expires_at,
      active: true,
    }, { onConflict: "link_id" });

    if (error) {
      console.error("[linkService] form_links upsert error:", error);
      return { ok: false, linkId: null, publicUrl: "", error };
    }
  } catch (e) {
    console.error("[linkService] form_links upsert threw:", e);
    return { ok: false, linkId: null, publicUrl: "", error: e };
  }

  const publicUrl = appUrl ? appUrl.replace(/\/$/, "") + "/form?id=" + linkId : "";

  // Disparo del email de invitación (fire-and-forget). Solo si hay email.
  if (dispararEmail && cliente.email) {
    fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "invitation", link_id: linkId }),
    })
      .then(r => r.json())
      .then(d => {
        if (typeof window !== "undefined" && window.toast) {
          window.toast(
            d && d.ok
              ? "✉️ Invitación enviada a " + cliente.email
              : "Link creado pero el email no se pudo enviar",
            d && d.ok ? "success" : "warning"
          );
        }
      })
      .catch(() => {
        if (typeof window !== "undefined" && window.toast) {
          window.toast("Link creado pero el email no se pudo enviar", "warning");
        }
      });
  }

  return { ok: true, linkId, publicUrl };
}
