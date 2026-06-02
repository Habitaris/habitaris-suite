// condicionesHelper.js — Condiciones laborales con fecha de vigencia (effective-dated).
//
// MODELO: cada empleado tiene un array de cambios de condiciones en kv_store,
// clave `hab:rrhh:condiciones:{empId}`. Cada registro lleva SOLO los campos que
// cambian en esa fecha:
//   { desde: "YYYY-MM-DD", arl?, sal?, auxT?, bono?, bonoConcepto?, bonoPrest?, reg? }
//
// REGLA DE VIGENCIA: un cambio rige desde su fecha `desde` hasta que aparezca otro
// cambio del mismo campo. Para un mes dado, se aplica el valor del registro más
// reciente cuyo `desde` sea <= al último día de ese mes. Los campos se acumulan:
// registros posteriores sobreescriben campo a campo los anteriores.
//
// INMUTABILIDAD: este helper NO decide nada sobre meses cerrados. Solo dice "qué
// condición regía en tal mes". El liquidador respeta el candado de mes pagado aparte.
//
// `mes` es 0-indexado (enero=0), igual que el resto del sistema (hab:nomina:anio:mes).

// Campos que una condición puede gobernar. Si un registro no trae un campo, no lo cambia.
export const CAMPOS_CONDICION = ["arl", "sal", "auxT", "bono", "bonoConcepto", "bonoPrest", "reg"];

/**
 * Devuelve los valores de condición vigentes para (anio, mes).
 * @param {Array} condiciones  array de registros {desde, ...campos}
 * @param {number} anio
 * @param {number} mes  0-indexado (enero=0)
 * @returns {Object} solo los campos efectivamente fijados por alguna condición vigente
 */
export function condicionVigente(condiciones, anio, mes) {
  if (!Array.isArray(condiciones) || condiciones.length === 0) return {};
  // Último día del mes objetivo (mes 0-indexado): new Date(anio, mes+1, 0)
  const finMes = new Date(anio, mes + 1, 0, 23, 59, 59);
  const aplicables = condiciones
    .filter((c) => c && typeof c.desde === "string" && new Date(c.desde + "T00:00:00") <= finMes)
    .sort((a, b) => a.desde.localeCompare(b.desde));
  const out = {};
  for (const c of aplicables) {
    for (const k of CAMPOS_CONDICION) {
      if (Object.prototype.hasOwnProperty.call(c, k) && c[k] !== undefined && c[k] !== null) {
        out[k] = c[k];
      }
    }
  }
  return out;
}

/**
 * Aplica las condiciones vigentes sobre un objeto de nómina del mes (n).
 * Solo sobreescribe los campos que alguna condición fija; el resto queda intacto.
 * No muta el original.
 */
export function aplicarCondiciones(n, condiciones, anio, mes) {
  const vig = condicionVigente(condiciones, anio, mes);
  if (Object.keys(vig).length === 0) return n;
  return { ...n, ...vig };
}
