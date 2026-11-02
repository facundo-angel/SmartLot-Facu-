// Construye las condiciones en el formato que consume FieldValidation:
// [{ label, met }]. Las reglas pueden ser declarativas ({ rule, message }) o
// funciones que reciben el valor actual y devuelven esa misma forma; las
// funciones permiten condiciones que dependen de otros campos del formulario.
export function buildConditions(schema, fieldName, values) {
  const rules = schema?.[fieldName];
  if (!rules) return [];

  const value = values?.[fieldName];
  return rules.map((item) => {
    const resolved = typeof item === 'function' ? item(value) : item;
    return { label: resolved?.message, met: Boolean(resolved?.rule?.(value)) };
  });
}

// Reglas comunes al alta de sedes de administrador y superadministrador.
// Cada rol suma sus propias reglas al combinarlas con las suyas.
export const SEDE_NOMBRE_VALIDATION = {
  nombre: [
    { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
    { rule: (v) => v?.trim().length >= 2, message: 'Mínimo 2 caracteres' },
  ],
};
