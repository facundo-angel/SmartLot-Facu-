import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  source,
  css,
  apiUsuario,
  apiSolicitudes,
  apiEmpresa,
  apiSede,
  apiGarage,
  constantes,
] = await Promise.all([
  readFile(new URL("./gestion_usuarios.jsx", import.meta.url), "utf8"),
  readFile(new URL("./gestion_usuarios.css", import.meta.url), "utf8"),
  readFile(new URL("../servicies/API_Usuario.js", import.meta.url), "utf8"),
  readFile(new URL("../servicies/API_SolicitudRegistro.js", import.meta.url), "utf8"),
  readFile(new URL("../servicies/API_Empresa.js", import.meta.url), "utf8"),
  readFile(new URL("../servicies/API_Sede.js", import.meta.url), "utf8"),
  readFile(new URL("../servicies/API_Garage.js", import.meta.url), "utf8"),
  readFile(new URL("../componentesSuperadmin/gestion_usuarios/constantes.js", import.meta.url), "utf8"),
]);

const entre = (inicio, fin, texto = source) => {
  const start = texto.indexOf(inicio);
  assert.notEqual(start, -1, `No se encontro el bloque de inicio: ${inicio}`);

  const end = texto.indexOf(fin, start + inicio.length);
  assert.notEqual(end, -1, `No se encontro el bloque de cierre: ${fin}`);

  return texto.slice(start, end);
};

test("la carga inicial pide seis recursos y conserva el patron mounted", () => {
  const carga = entre("const loadData = async () => {", "    loadData();");

  assert.match(
    carga,
    /const \[usuRes, empRes, sedRes, garRes, auditRes, solRes\] = await Promise\.all\(\[/
  );
  assert.match(carga, /UsuariosGetAll\(\)/);
  assert.match(carga, /EmpresasGetAll\(\)/);
  assert.match(carga, /SedesGetAll\(\)/);
  assert.match(carga, /GaragesGetAll\(\)/);
  assert.match(carga, /UsuariosGetAuditoria\(\)/);
  assert.match(carga, /SolicitudesRegistroGetAll\(\)/);

  assert.match(carga, /setLoading\(true\);/);
  assert.match(carga, /setLoadingAuditoria\(true\);/);
  assert.match(carga, /if \(!mounted\) return;/);
  assert.match(source, /return \(\) => \{ mounted = false; \};/);
  assert.match(carga, /if \(!usuRes\.respuesta\)/);
  assert.match(carga, /setError\("No se pudieron cargar los usuarios\."\)/);
  assert.match(carga, /setLoading\(false\);/);
  assert.match(carga, /console\.error\("Error loading user data:", err\)/);
  assert.match(carga, /setError\("Ocurrió un error inesperado\."\)/);
  assert.match(carga, /if \(mounted\) setLoading\(false\);/);
  assert.match(carga, /if \(mounted\) setLoadingAuditoria\(false\);/);
});

test("los datos crudos se convierten en mapas y usuarios normalizados", () => {
  const carga = entre("const loadData = async () => {", "    loadData();");

  assert.match(carga, /const usuariosRaw = obtenerListado\(usuRes\.datos\)/);
  assert.match(carga, /const empresas = empRes\.respuesta \? obtenerListado\(empRes\.datos\) : \[\]/);
  assert.match(carga, /const sedes = sedRes\.respuesta \? obtenerListado\(sedRes\.datos\) : \[\]/);
  assert.match(carga, /const garages = garRes\.respuesta \? obtenerListado\(garRes\.datos\) : \[\]/);
  assert.match(carga, /Object\.fromEntries\(empresas\.map\(\(e\) => \[Number\(e\.id\), e\.nombre\]\)\)/);
  assert.match(carga, /Object\.fromEntries\(sedes\.map\(\(s\) => \[Number\(s\.id\), s\.nombre\]\)\)/);
  assert.match(carga, /const id = g\.id_garage \?\? g\.id \?\? g\._id;/);
  assert.match(
    carga,
    /g\.nombre \|\| g\.name \|\| g\.descripcion \|\| g\.ubicacion \|\| g\.nombre_garage \|\| g\.garage_nombre \|\| "Garage"/
  );
  assert.match(
    carga,
    /mergeUsuariosById\(usuariosRaw\)\.map\(\(u\) => normalizarUsuario\(u, eMap, sMap, gMap\)\)/
  );
  assert.match(carga, /setSolicitudes\(obtenerListado\(solRes\.datos\)\)/);
  assert.match(carga, /setAuditoria\(crearEventosAuditoriaUsuario\(obtenerListado\(auditRes\.datos\)\)\)/);
});

test("las tres recargas usan force y reutilizan los mapas actuales", () => {
  const recargas = entre("const recargarAuditoria = async () => {", "  useEffect(() => {");

  assert.match(recargas, /const auditRes = await UsuariosGetAuditoria\(\)/);
  assert.match(recargas, /setLoadingAuditoria\(true\)/);
  assert.match(recargas, /setLoadingAuditoria\(false\)/);
  assert.match(recargas, /const solRes = await SolicitudesRegistroGetAll\(\{ force: true \}\)/);
  assert.match(recargas, /const \[usuRes, empRes\] = await Promise\.all\(\[/);
  assert.match(recargas, /UsuariosGetAll\(\{ force: true \}\)/);
  assert.match(recargas, /EmpresasGetAll\(\{ force: true \}\)/);
  assert.match(recargas, /if \(!usuRes\.respuesta\) return;/);
  assert.match(recargas, /normalizarUsuario\(u, eMap, sedeMap, garageMap\)/);
});

test("los servicios usan los endpoints y metodos actuales", () => {
  assert.match(apiUsuario, /let url = '\/api\/usuario'/);
  assert.match(apiUsuario, /apiClient\.get\(url\)/);
  assert.match(apiUsuario, /let url = '\/api\/usuario\/auditoria'/);
  assert.match(apiUsuario, /let url = '\/api\/usuario\/' \+ id \+ '\/estado'/);
  assert.match(apiUsuario, /apiClient\.patch\(url, \{ activo \}\)/);
  assert.match(apiUsuario, /apiClient\.delete\(url\)/);
  assert.match(apiUsuario, /let url = '\/api\/usuario\/impersonate'/);
  assert.match(apiUsuario, /apiClient\.post\(url, \{ id \}\)/);

  assert.match(apiEmpresa, /let url = '\/api\/empresa'/);
  assert.match(apiSede, /let url = '\/api\/sede'/);
  assert.match(apiGarage, /let url = '\/api\/garage'/);

  assert.match(apiSolicitudes, /const base = '\/api\/solicitud-registro'/);
  assert.match(apiSolicitudes, /apiClient\.get\(base\)/);
  assert.match(apiSolicitudes, /apiClient\.patch\(`\$\{base\}\/\$\{id\}\/\$\{action\}`\)/);
  assert.match(apiSolicitudes, /transition\(id, 'aprobar'\)/);
  assert.match(apiSolicitudes, /transition\(id, 'rechazar'\)/);
});

test("aprobar solicitud confirma, anima, recarga dos fuentes y avisa", () => {
  const aprobar = entre(
    "const handleAprobarSolicitud = async (solicitud) => {",
    "  const handleRechazarSolicitud"
  );

  assert.match(aprobar, /¿Aprobar solicitud\?/);
  assert.match(aprobar, /Se creará \$\{nombreEmpresa\} y su usuario administrador\./);
  assert.match(aprobar, /confirmButtonColor: "#16A34A"/);
  assert.match(aprobar, /cancelButtonColor: "#64748B"/);
  assert.match(aprobar, /reverseButtons: true/);
  assert.match(aprobar, /zIndex: Z_INDEX\.SWAL_DIALOG/);
  assert.match(aprobar, /if \(!result\.isConfirmed\) return;/);
  assert.match(aprobar, /setResolviendoSolicitud\(solicitud\.id\)/);
  assert.match(aprobar, /SolicitudesRegistroAprobar\(solicitud\.id\)/);
  assert.match(aprobar, /gsap\.to\(`\.solicitud-card-id-\$\{solicitud\.id\}`/);
  assert.match(aprobar, /scale: 0\.95/);
  assert.match(aprobar, /duration: 0\.25/);
  assert.match(aprobar, /ease: "power2\.inOut"/);
  assert.match(aprobar, /await cargarSolicitudes\(\);/);
  assert.match(aprobar, /await recargarUsuariosYEmpresas\(\);/);
  assert.match(aprobar, /showToast\("Empresa y administrador creados\.", "success"\)/);
  assert.match(
    aprobar,
    /Swal\.fire\("Error", response\.datos\?\.message \|\| "No se pudo aprobar\.", "error"\)/
  );
  assert.match(aprobar, /Swal\.fire\("Error de red", "Hubo un error al conectar\.", "error"\)/);
  assert.match(aprobar, /setResolviendoSolicitud\(null\)/);
});

test("rechazar solicitud solo recarga solicitudes y no recarga usuarios", () => {
  const rechazar = entre(
    "const handleRechazarSolicitud = async (solicitud) => {",
    "  const handleArchivar"
  );

  assert.match(rechazar, /¿Rechazar solicitud\?/);
  assert.match(rechazar, /Se descartará el registro de \$\{nombreEmpresa\}\./);
  assert.match(rechazar, /confirmButtonColor: "#EF4444"/);
  assert.match(rechazar, /SolicitudesRegistroRechazar\(solicitud\.id\)/);
  assert.match(rechazar, /gsap\.to\(`\.solicitud-card-id-\$\{solicitud\.id\}`/);
  assert.match(rechazar, /await cargarSolicitudes\(\);/);
  assert.match(rechazar, /showToast\("Solicitud rechazada\.", "success"\)/);
  assert.match(
    rechazar,
    /Swal\.fire\("Error", response\.datos\?\.message \|\| "No se pudo rechazar\.", "error"\)/
  );
  assert.doesNotMatch(rechazar, /recargarUsuariosYEmpresas/);
  assert.match(rechazar, /setResolviendoSolicitud\(null\)/);
});

test("archivar usa estado false, anima la tarjeta y recarga auditoria", () => {
  const archivar = entre("const handleArchivar = async (id, nombre) => {", "  const handleRestaurar");

  assert.match(archivar, /¿Archivar a este usuario\?/);
  assert.match(archivar, /\$\{nombre\} quedará inactivo\./);
  assert.match(archivar, /confirmButtonColor: "#2563EB"/);
  assert.match(archivar, /UsuariosPatchEstado\(id, false\)/);
  assert.match(archivar, /gsap\.to\(`\.usuario-card-id-\$\{id\}`/);
  assert.match(archivar, /scale: 0\.9/);
  assert.match(archivar, /duration: 0\.25/);
  assert.match(
    archivar,
    /prev\.map\(\(u\) => \(u\.id === id \? \{ \.\.\.u, activo: false \} : u\)\)/
  );
  assert.match(archivar, /recargarAuditoria\(\)/);
  assert.match(archivar, /Swal\.fire\("Error", "No se pudo archivar\.", "error"\)/);
});

test("restaurar usa estado true, cierra el modal y muestra el timer de exito", () => {
  const restaurar = entre("const handleRestaurar = async (id, nombre) => {", "  const handleEliminar");

  assert.match(restaurar, /UsuariosPatchEstado\(id, true\)/);
  assert.match(restaurar, /setShowArchived\(false\)/);
  assert.match(
    restaurar,
    /prev\.map\(\(u\) => \(u\.id === id \? \{ \.\.\.u, activo: true \} : u\)\)/
  );
  assert.match(restaurar, /await recargarAuditoria\(\)/);
  assert.match(restaurar, /title: "Restaurado"/);
  assert.match(restaurar, /\$\{nombre\} ha sido restaurado\./);
  assert.match(restaurar, /timer: 1500/);
  assert.match(restaurar, /showConfirmButton: false/);
  assert.match(restaurar, /zIndex: Z_INDEX\.SWAL_DIALOG/);
  assert.match(restaurar, /Swal\.fire\("Error", "No se pudo restaurar\.", "error"\)/);
});

test("eliminar cierra el modal antes de confirmar y filtra al usuario", () => {
  const eliminar = entre("const handleEliminar = async (id, nombre) => {", "  const handleLoginAs");

  assert.match(eliminar, /setShowArchived\(false\);/);
  assert.ok(
    eliminar.indexOf("setShowArchived(false);") < eliminar.indexOf("Swal.fire({"),
    "el modal se cierra antes de mostrar la confirmacion"
  );
  assert.match(eliminar, /¿Eliminar permanentemente\?/);
  assert.match(eliminar, /UsuariosDelete\(id\)/);
  assert.match(eliminar, /prev\.filter\(\(u\) => u\.id !== id\)/);
  assert.match(eliminar, /await recargarAuditoria\(\)/);
  assert.match(eliminar, /Swal\.fire\("Eliminado", "Usuario eliminado permanentemente\.", "success"\)/);
  assert.match(eliminar, /Swal\.fire\("Error", "No se pudo eliminar\.", "error"\)/);
});

test("la impersonacion conserva el orden backup, api, fallback, cookies y navegacion", () => {
  const loginAs = entre("const handleLoginAs = async (targetUser) => {", "  // Animaciones iniciales");

  const pasos = [
    "guardarSuperadminBackup(usuario)",
    "UsuariosImpersonate(targetUser.id)",
    "const finalUser = userData || targetUser",
    "guardarUsuarioImpersonado(finalUser)",
    "setRoleTransition(true)",
    "setUsuario(finalUser)",
    "navigate(getUserHomeRoute(finalUser))",
  ];
  const posiciones = pasos.map((paso) => loginAs.indexOf(paso));
  posiciones.forEach((posicion, indice) => {
    assert.notEqual(posicion, -1, `No se encontro el paso: ${pasos[indice]}`);
  });
  for (let i = 1; i < posiciones.length; i++) {
    assert.ok(posiciones[i] > posiciones[i - 1], `Orden incorrecto en ${pasos[i]}`);
  }

  assert.match(loginAs, /userData = res\.datos\.usuario \|\| res\.datos/);
  assert.match(loginAs, /¿Ingresar como \$\{targetUser\.nombre\}\?/);
  assert.match(loginAs, /zIndex: Z_INDEX\.SWAL_DIALOG/);
  assert.match(loginAs, /if \(!result\.isConfirmed\) return;/);
});

test("las opciones de filtro excluyen inactivos y aplican los demas filtros", () => {
  const opciones = entre("const empresasDisponibles = useMemo", "  const usuariosFiltrados = useMemo");

  assert.equal((opciones.match(/obtenerOpcionesUnicas\(/g) || []).length, 3);
  assert.equal((opciones.match(/if \(u\.activo === false\) return false;/g) || []).length, 3);
  assert.match(opciones, /selectedRol && u\.id_rol !== Number\(selectedRol\)/);
  assert.match(opciones, /selectedSede && u\.sede !== selectedSede/);
  assert.match(opciones, /selectedGarage && !u\.garages\.includes\(selectedGarage\)/);
  assert.match(opciones, /selectedEmpresa && u\.empresa !== selectedEmpresa/);
  assert.match(opciones, /return u\.garages\.length > 0;/);
});

test("el listado principal busca, filtra y ordena por rol y empresa", () => {
  const filtrados = entre("const usuariosFiltrados = useMemo", "  const usuariosArchivados");

  assert.match(filtrados, /const query = searchTerm\.toLowerCase\(\)\.trim\(\)/);
  assert.match(filtrados, /u\.nombre\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(filtrados, /u\.email\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(filtrados, /u\.role\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(filtrados, /const coincideRol = !selectedRol \|\| u\.id_rol === Number\(selectedRol\)/);
  assert.match(filtrados, /const coincideEmpresa = !selectedEmpresa \|\| u\.empresa === selectedEmpresa/);
  assert.match(filtrados, /const coincideSede = !selectedSede \|\| u\.sede === selectedSede/);
  assert.match(filtrados, /const coincideGarage = !selectedGarage \|\| u\.garages\.includes\(selectedGarage\)/);
  assert.match(filtrados, /ROLE_ORDER\.indexOf\(a\.id_rol\)/);
  assert.match(filtrados, /ROLE_ORDER\.indexOf\(b\.id_rol\)/);
  assert.match(filtrados, /if \(!a\.empresa\) return 1;/);
  assert.match(filtrados, /if \(!b\.empresa\) return -1;/);
  assert.match(filtrados, /a\.empresa\.localeCompare\(b\.empresa, 'es', \{ sensitivity: 'base' \}\)/);
  assert.match(constantes, /export const ROLE_ORDER = \[4, 5, 1, 3, 2\]/);
});

test("los contadores y las busquedas secundarias conservan sus reglas", () => {
  assert.match(
    source,
    /const activeFiltersCount = \[selectedEmpresa, selectedSede, selectedGarage\]\.filter\(Boolean\)\.length/
  );

  const derivados = entre("const usuariosArchivados = useMemo", "  const handleAprobarSolicitud");

  assert.match(derivados, /u\.activo !== false/);
  assert.match(derivados, /searchArchivedTerm\.toLowerCase\(\)\.trim\(\)/);
  assert.match(derivados, /u\.role\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(derivados, /s\?\.estado === "pendiente"/);
  assert.match(
    derivados,
    /`\$\{s\.nombre \|\| ""\} \$\{s\.apellido \|\| ""\}`\.toLowerCase\(\)\.includes\(query\)/
  );
  assert.match(derivados, /\(s\.empresa_nombre \|\| ""\)\.toLowerCase\(\)\.includes\(query\)/);
  assert.match(derivados, /const totalSolicitudesPendientes = solicitudesPendientes\.length/);
});

test("los filtros dependientes se limpian cuando desaparecen opciones", () => {
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*setSelectedEmpresa\(""\);\s*setSelectedSede\(""\);\s*setSelectedGarage\(""\);\s*\}, \[selectedRol\]\);/
  );

  const resets = entre(
    "if (selectedEmpresa && !empresasDisponibles.includes(selectedEmpresa))",
    "  const usuariosFiltrados = useMemo"
  );

  assert.match(resets, /setSelectedEmpresa\(""\)/);
  assert.match(resets, /setSelectedSede\(""\)/);
  assert.match(resets, /setSelectedGarage\(""\)/);
  assert.match(resets, /\[empresasDisponibles, selectedEmpresa\]/);
  assert.match(resets, /\[sedesDisponibles, selectedSede\]/);
  assert.match(resets, /\[garagesDisponibles, selectedGarage\]/);
});

test("los overlays bloquean el scroll y cierran con Escape", () => {
  const archivados = entre(
    "if (!showArchived)",
    "  const empresasDisponibles = useMemo"
  );

  assert.match(archivados, /setSearchArchivedTerm\(""\)/);
  assert.match(archivados, /document\.body\.style\.overflow = "hidden"/);
  assert.match(archivados, /e\.key === "Escape"/);
  assert.match(archivados, /setShowArchived\(false\)/);
  assert.match(archivados, /document\.removeEventListener\("keydown", handleKey\)/);

  const solicitudes = entre(
    "  const cerrarSolicitudes = () => {",
    "  // Animación de la bandeja de solicitudes"
  );

  assert.match(solicitudes, /setShowSolicitudes\(false\)/);
  assert.match(solicitudes, /setSearchSolicitudesTerm\(""\)/);
  assert.match(solicitudes, /document\.body\.style\.overflow = "hidden"/);
  assert.match(solicitudes, /cerrarSolicitudes\(\)/);
  assert.match(solicitudes, /\[showSolicitudes\]/);
});

test("las animaciones usan los selectores y clases actuales", () => {
  assert.match(source, /gsap\.registerPlugin\(useGSAP\)/);
  assert.match(source, /\.usuarios-animate-header/);
  assert.match(source, /\.usuarios-animate-toolbar/);
  assert.match(source, /querySelectorAll\("\.usuario-card"\)/);
  assert.match(source, /\.modal-portal-overlay/);
  assert.match(source, /\.modal-archivados-panel/);
  assert.match(source, /\.modal-solicitudes-panel/);
  assert.match(source, /stagger: 0\.04/);
  assert.match(source, /duration: 0\.35/);
  assert.match(source, /ease: "power2\.out"/);

  for (const clase of [
    "modal-archivados-panel",
    "modal-solicitudes-panel",
    "usuarios-toolbar-skeleton",
    "skeleton-search",
    "skeleton-role-pills",
    "archivados-count-badge",
    "solicitudes-count-badge",
    "usuarios-feedback-error",
    "usuarios-no-results",
  ]) {
    assert.match(css, new RegExp(`\\.${clase}`), `Falta la clase CSS .${clase}`);
  }
});

test("el render conserva skeletons, auditoria, modales y estados vacios", () => {
  assert.match(source, /<HeaderSuperadmin \/>/);
  assert.match(source, /<FooterSuperadmin \/>/);
  assert.match(source, /Array\.from\(\{ length: 6 \}\)\.map\(\(_, i\) => \(/);
  assert.match(source, /<UserCardSkeleton key=\{i\} \/>/);
  assert.match(source, /<AuditoriaPanel/);
  assert.match(source, /titulo="Auditoría de usuarios"/);
  assert.match(source, /descripcion="Últimas ediciones y borrados registrados\."/);
  assert.match(source, /maxItems=\{10\}/);
  assert.match(source, /<ModalGaragesUsuario/);
  assert.match(source, /<ModalArchivados/);
  assert.match(source, /<ModalSolicitudes/);
  assert.match(source, /No se encontraron resultados para tu búsqueda\./);
  assert.match(source, /No hay usuarios registrados en esta categoría\./);
});
