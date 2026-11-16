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

test("la vista Superadmin usa su header, useLocation y EmpresasGetAll", () => {
  assert.match(source, /import useFormularioSede from "\.\.\/hooks\/useFormularioSede";/);
  assert.match(source, /import HeaderSuperadmin from "\.\.\/componentesSuperadmin\/header_superadmin";/);
  assert.match(source, /import \{ EmpresasGetAll \} from "\.\.\/servicies\/API_Empresa";/);
  assert.match(source, /import \{ useLocation, useNavigate \} from "react-router-dom";/);
  assert.doesNotMatch(source, /EmpresasGetById/);
  assert.doesNotMatch(source, /useAuth/);
  assert.match(source, /<HeaderSuperadmin \/>/);
});

test("el schema de Superadmin agrega idEmpresa a las reglas comunes", () => {
  const esquema = entre("const validationSchema = {", "};");

  assert.match(esquema, /idEmpresa:/);
  assert.match(esquema, /\(v\) => v !== ""/);
  assert.match(esquema, /message: "Selecciona una empresa"/);
  assert.match(esquema, /\.\.\.SEDE_NOMBRE_VALIDATION/);
});

test("Superadmin precarga la empresa desde location.state y carga una sola vez", () => {
  assert.match(
    source,
    /idEmpresa: location\.state\?\.empresaId \? String\(location\.state\.empresaId\) : ""/
  );
  assert.match(source, /const res = await EmpresasGetAll\(\);/);
  assert.match(source, /return res\.respuesta \? obtenerListado\(res\.datos\) : null;/);
  assert.match(source, /procesarEmpresa: \(lista\) => setEmpresas\(lista\)/);
  assert.match(source, /dependenciasCargaEmpresa: \[\]/);
});

test("obtenerListado de Superadmin solo reconoce array, datos y data", () => {
  const listado = entre("const obtenerListado = (datos) => {", "};");

  assert.match(listado, /Array\.isArray\(datos\)/);
  assert.match(listado, /Array\.isArray\(datos\?\.datos\)/);
  assert.match(listado, /Array\.isArray\(datos\?\.data\)/);
  assert.doesNotMatch(listado, /value|reservas|vehiculos/);
});

test("Superadmin conserva el id del select y el guard de Admin no aparece", () => {
  assert.match(source, /obtenerIdEmpresa: \(\{ formData \}\) => Number\(formData\.idEmpresa\)/);
  assert.doesNotMatch(source, /Tu usuario no tiene una empresa asociada/);
  assert.match(source, /<option value="">Seleccionar empresa\.\.\.<\/option>/);
  assert.match(source, /value=\{formData\.idEmpresa\}/);
  assert.match(source, /required>/);
});

test("Superadmin navega con empresaId, replace y state segun la accion", () => {
  assert.match(source, /alGuardar: \(\{ formData \}\) => navigate\("\/superadmin\/gestion_empresas", \{/);
  assert.match(source, /alCancelar: \(\{ formData \}\) => navigate\("\/superadmin\/gestion_empresas", \{/);
  assert.match(source, /alVolver: \(\{ formData \}\) => navigate\("\/superadmin\/gestion_empresas", \{/);
  assert.match(source, /state: \{ empresaId: Number\(formData\.idEmpresa\) \}/);
  assert.match(source, /state: \{ empresaId: Number\(formData\.idEmpresa\) \|\| undefined \}/);
  assert.match(source, /replace: true/);
});

test("Superadmin conserva sus clases, skeleton y estilo del boton", () => {
  assert.match(source, /className="boton-back"/);
  assert.match(source, /SUPERADMIN/);
  assert.match(source, /cancelButtonStyle=\{\{ backgroundColor: "grey" \}\}/);

  assert.match(source, /form: "agregar-sede-form"/);
  assert.match(source, /inputGroup: "input-group-superadmin"/);
  assert.match(source, /error: "form-error-superadmin"/);
  assert.match(source, /actions: "agregar-sede-actions"/);
  assert.match(source, /saveButton: "btn-guardar-grande"/);
  assert.match(source, /cancelButton: "btn-cancelar-grande"/);
  assert.match(source, /agregar-sede-form-skeleton/);
  assert.match(source, /input-skeleton-superadmin/);
  assert.match(source, /skeleton-form-textarea/);
  assert.match(source, /skeleton-form-button secondary/);
});

test("el payload compartido mantiene seis claves y el error de respuesta", () => {
  const payload = entre("const response = await SedesCreate({", "});", hookSource);

  assert.match(payload, /id_empresa: obtenerIdEmpresa\(\{ formData \}\)/);
  assert.match(payload, /nombre: formData\.nombre\.trim\(\)/);
  assert.match(payload, /descripcion: formData\.descripcion\.trim\(\)/);
  assert.match(payload, /ubicacion: formData\.ubicacion\.trim\(\)/);
  assert.match(payload, /latitud: coordenadas\.lat/);
  assert.match(payload, /longitud: coordenadas\.lng/);
  assert.doesNotMatch(payload, /direccion/);
  assert.match(hookSource, /setError\(response\.datos\?\.message \|\| "Error al crear la sede\."\)/);
});
