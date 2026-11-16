import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("./FormularioSede.jsx", import.meta.url), "utf8");

const entre = (inicio, fin, texto = source) => {
  const start = texto.indexOf(inicio);
  assert.notEqual(start, -1, `No se encontro el bloque de inicio: ${inicio}`);

  const end = texto.indexOf(fin, start + inicio.length);
  assert.notEqual(end, -1, `No se encontro el bloque de cierre: ${fin}`);

  return texto.slice(start, end);
};

test("la descripcion sigue siendo opcional", () => {
  const descripcion = entre(
    '<label className="label-optional">Descripción</label>',
    "<div className={classNames.inputGroup}>"
  );

  assert.match(descripcion, /placeholder="Descripción de la sede \(opcional\)"/);
  assert.match(descripcion, /rows=\{3\}/);
  assert.match(descripcion, /autoComplete="off"/);
  assert.doesNotMatch(descripcion, /required/);
});

test("nombre y ubicacion conservan su validacion nativa", () => {
  const nombre = entre('type="text"', "<FieldValidation");

  assert.match(nombre, /placeholder="Ej: Sede Central"/);
  assert.match(nombre, /\{\.\.\.field\('nombre'\)\}/);
  assert.match(nombre, /required/);

  assert.match(source, /buildConditions\(validationSchema, 'nombre', formData\)/);
  assert.match(source, /isTouched=\{touched\.nombre\}/);

  const ubicacion = entre("<UbicacionAutocomplete", "{error &&");
  assert.match(ubicacion, /value=\{formData\.ubicacion\}/);
  assert.match(
    ubicacion,
    /onChange=\{\(value\) => actualizarCampo\('ubicacion', value\)\}/
  );
  assert.match(ubicacion, /onPlaceSelect=\{onCoordenadasChange\}/);
  assert.match(ubicacion, /placeholder="Ej: Av\. Corrientes 1234, CABA"/);
  assert.match(ubicacion, /required/);
});

test("el formulario respeta el slot de empresa y las clases configurables", () => {
  assert.match(source, /<section className=\{classNames\.form\}>/);
  assert.match(source, /\{empresaField\}/);
  assert.match(source, /className=\{classNames\.inputGroup\}/);
  assert.match(source, /className=\{classNames\.error\}/);
  assert.match(source, /className=\{classNames\.actions\}/);
  assert.match(source, /className=\{classNames\.saveButton\}/);
  assert.match(source, /className=\{classNames\.cancelButton\}/);
  assert.match(source, /style=\{cancelButtonStyle\}/);
});

test("los botones conservan texto, icono y estado de carga", () => {
  assert.match(source, /CircleCheck/);
  assert.match(source, /disabled=\{loading\}/);
  assert.match(source, /\{loading \? 'Guardando\.\.\.' : 'Guardar sede'\}/);
  assert.match(source, /<span>Cancelar<\/span>/);
  assert.match(source, /onClick=\{onGuardar\}/);
  assert.match(source, /onClick=\{onCancelar\}/);
});

test("actualizarCampo conserva el resto del formData", () => {
  assert.match(
    source,
    /setFormData\(\(prev\) => \(\{ \.\.\.prev, \[name\]: value \}\)\)/
  );
  assert.match(source, /value=\{formData\.descripcion\}/);
});
