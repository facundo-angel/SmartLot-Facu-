import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const viewPath = new URL("./agregar_sede.jsx", import.meta.url);
const hookPath = new URL("../hooks/useFormularioSede.js", import.meta.url);
const [source, hookSource] = await Promise.all([
  readFile(viewPath, "utf8"),
  readFile(hookPath, "utf8"),
]);

const entre = (inicio, fin, texto = source) => {
  const start = texto.indexOf(inicio);
  assert.notEqual(start, -1, `No se encontro el bloque de inicio: ${inicio}`);

  const end = texto.indexOf(fin, start + inicio.length);
  assert.notEqual(end, -1, `No se encontro el bloque de cierre: ${fin}`);

  return texto.slice(start, end);
};

test("la vista Admin usa su header, useAuth y EmpresasGetById", () => {
  assert.match(source, /import useFormularioSede from "\.\.\/hooks\/useFormularioSede";/);
  assert.match(source, /import Header from "\.\.\/componentesAdmin\/header_admin";/);
  assert.match(source, /import \{ EmpresasGetById \} from "\.\.\/servicies\/API_Empresa";/);
  assert.match(source, /import \{ useAuth \} from "\.\.\/contexts\/useAuth";/);
  assert.doesNotMatch(source, /useLocation/);
  assert.doesNotMatch(source, /EmpresasGetAll/);
  assert.match(source, /<Header \/>/);
});

test("el schema de Admin es solo el comun de nombre", () => {
  assert.match(source, /const validationSchema = SEDE_NOMBRE_VALIDATION;/);
  assert.doesNotMatch(source, /idEmpresa:/);
});

test("Admin obtiene su empresa desde el usuario y recarga al cambiarla", () => {
  assert.match(source, /const res = await EmpresasGetById\(Number\(usuario\.id_empresa\)\);/);
  assert.match(source, /if \(!usuario\?\.id_empresa\) return null;/);
  assert.match(source, /return res\.respuesta \? res\.datos : null;/);
  assert.match(source, /dependenciasCargaEmpresa: \[usuario\?\.id_empresa\]/);

  assert.match(source, /const emp = Array\.isArray\(datos\) \? datos\[0\] : datos;/);
  assert.match(source, /setEmpresaNombre\(emp\?\.nombre \|\| ""\)/);
  assert.match(source, /className="empresa-fija-admin"/);
  assert.match(source, /\{empresaNombre \|\| "—"\}/);
});

test("Admin conserva el guard y el id_empresa del payload", () => {
  assert.match(source, /validarAntesDeGuardar: \(\) =>/);
  assert.match(source, /"Tu usuario no tiene una empresa asociada\."/);
  assert.match(source, /obtenerIdEmpresa: \(\) => Number\(usuario\.id_empresa\)/);
});

test("Admin navega sin state y conserva sus clases y skeleton", () => {
  assert.match(source, /alGuardar: \(\) => navigate\("\/gestion_sedes", \{ replace: true \}\)/);
  assert.match(source, /alCancelar: \(\) => navigate\("\/gestion_sedes", \{ replace: true \}\)/);
  assert.match(source, /alVolver: \(\) => navigate\("\/gestion_sedes"\)/);

  assert.match(source, /className="boton-back-agregar"/);
  assert.match(source, /aria-label="Volver a gestión de sedes"/);
  assert.match(source, /PANEL DE ADMINISTRACIÓN/);

  assert.match(source, /form: "agregar-sede-admin-form"/);
  assert.match(source, /inputGroup: "input-group-sede-admin"/);
  assert.match(source, /error: "form-error-sede-admin"/);
  assert.match(source, /actions: "agregar-sede-admin-actions"/);
  assert.match(source, /saveButton: "btn-guardar-sede"/);
  assert.match(source, /cancelButton: "btn-cancelar-sede"/);
  assert.match(source, /agregar-sede-admin-form-skeleton/);
  assert.match(source, /input-sede-admin-skeleton/);
  assert.match(source, /skl-form-textarea/);
  assert.match(source, /skl-form-button secondary/);
  assert.doesNotMatch(source, /cancelButtonStyle/);
});

test("el payload compartido mantiene sus seis claves y no envia direccion", () => {
  const payload = entre("const response = await SedesCreate({", "});", hookSource);

  assert.match(payload, /id_empresa: obtenerIdEmpresa\(\{ formData \}\)/);
  assert.match(payload, /nombre: formData\.nombre\.trim\(\)/);
  assert.match(payload, /descripcion: formData\.descripcion\.trim\(\)/);
  assert.match(payload, /ubicacion: formData\.ubicacion\.trim\(\)/);
  assert.match(payload, /latitud: coordenadas\.lat/);
  assert.match(payload, /longitud: coordenadas\.lng/);
  assert.doesNotMatch(payload, /direccion/);
  assert.match(hookSource, /SedesCreate/);
});

test("el hook conserva el mounted, el isValid y el error de respuesta", () => {
  assert.match(hookSource, /let mounted = true;/);
  assert.match(hookSource, /return \(\) => \{ mounted = false; \};/);
  assert.match(hookSource, /if \(mounted\) setCargandoEmpresa\(false\)/);
  assert.match(hookSource, /if \(!isValid\) return;/);
  assert.match(hookSource, /setError\(response\.datos\?\.message \|\| "Error al crear la sede\."\)/);
  assert.match(hookSource, /if \(response\.respuesta\) \{/);
  assert.match(hookSource, /setLoading\(false\);/);
});
