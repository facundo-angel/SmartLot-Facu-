import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboardPath = new URL("./empleados_dashboard.jsx", import.meta.url);
const modalReportePath = new URL("../componentesEmpleado/modal_reporte_empleado.jsx", import.meta.url);
const [source, modalReporteSource] = await Promise.all([
  readFile(dashboardPath, "utf8"),
  readFile(modalReportePath, "utf8"),
]);

const entre = (inicio, fin) => {
  const start = source.indexOf(inicio);
  assert.notEqual(start, -1, `No se encontro el bloque de inicio: ${inicio}`);

  const end = source.indexOf(fin, start + inicio.length);
  assert.notEqual(end, -1, `No se encontro el bloque de cierre: ${fin}`);

  return source.slice(start, end);
};

test("el refresco de reservas usa createReservaRefresh y bindReservaPolling", () => {
  const refresco = entre(
    "const refresh = createReservaRefresh({",
    "}, [idUsuario]);"
  );

  assert.match(refresco, /fetchReservations: \(options\) =>/);
  assert.match(refresco, /ReservasGetByUsuario\(idUsuario, options\)/);
  assert.match(refresco, /onData: \(rows, reason\) =>/);
  assert.match(refresco, /onError: \(\) => setRefreshError\(/);
  assert.match(refresco, /onSettled: \(\) => setLoadingReservas\(false\)/);
  assert.match(refresco, /void refresh\.refresh\('initial'\)/);
  assert.match(
    refresco,
    /bindReservaPolling\(\(reason\) => refresh\.refresh\(reason\), window, document\)/
  );
  assert.match(refresco, /refresh\.dispose\(\)/);
});

test("actualiza y elimina reservas localmente por ID antes de refrescar", () => {
  const edicion = entre("const handleReservaActualizada", "const abrirModalReporte");

  assert.match(edicion, /reservaRefreshRef\.current\?\.invalidate\(\)/);
  assert.match(edicion, /setReservas\(\(prev\) =>\s*prev\.map\(/);
  assert.match(edicion, /const id = r\.id \?\? r\.id_reserva/);
  assert.match(
    edicion,
    /Number\(id\) === Number\(reservaActualizada\.id \?\? reservaActualizada\.id_reserva\)/
  );
  assert.match(edicion, /setReservaEditando\(null\)/);
  assert.match(edicion, /setReservaNormEditando\(null\)/);
  assert.match(edicion, /reservaRefreshRef\.current\?\.refresh\("edit"\)/);
  assert.match(edicion, /prev\.filter\(/);
  assert.match(edicion, /Number\(id\) !== Number\(idReserva\)/);
});

test("mantiene el filtro de canceladas, expiradas y salidas registradas", () => {
  const refresco = entre(
    "const refresh = createReservaRefresh({",
    "}, [idUsuario]);"
  );
  assert.match(
    refresco,
    /setReservas\(rows\.filter\(\(row\) => !esReservaCancelada\(row\)\)\)/
  );

  const normalizadas = entre(
    "const reservasNormalizadas = useMemo",
    "const reservaPrincipal"
  );

  assert.match(normalizadas, /if \(esReservaCancelada\(reserva\.raw\)\) return false;/);
  assert.match(
    normalizadas,
    /String\(reserva\.estado\)\.toLowerCase\(\) === "expirada" && !reserva\.entradaRegistrada/
  );
  assert.match(normalizadas, /if \(reserva\.salidaRegistrada\) return false;/);
  assert.match(
    normalizadas,
    /const salidaProgramada = toReservaInstant\(reserva\.fechaSalidaCruda\)/
  );
  assert.match(
    normalizadas,
    /if \(!reserva\.entradaRegistrada && salidaProgramada && salidaProgramada <= new Date\(\)\) return false;/
  );
  assert.match(
    normalizadas,
    /\.sort\(\(a, b\) => `\$\{a\.fecha\} \$\{a\.horario\}`\.localeCompare\(`\$\{b\.fecha\} \$\{b\.horario\}`\)\)/
  );
});

test("normaliza reservas con los aliases de vehiculo, garage, ubicacion y estado", () => {
  const normalizador = entre(
    "const normalizarReserva =",
    "const EmpleadoDisponibilidadSkeleton"
  );

  assert.match(
    normalizador,
    /\["id_vehiculo", "idVehiculo", "vehiculo_id", "vehiculoId"\]/
  );
  assert.match(normalizador, /obtenerIdGarageAsignado\(reserva\)/);
  assert.match(
    normalizador,
    /\["ubicacion", "sede", "nombre_sede", "nombre_garage", "garage_nombre"\]/
  );
  assert.match(
    normalizador,
    /\["plaza", "nro_plaza", "numero_plaza", "espacio"\]/
  );
  assert.match(
    normalizador,
    /\["nombre_zona", "nivel", "piso", "sector", "zona"\]/
  );
  assert.match(
    normalizador,
    /\["estado", "status", "estado_reserva", "estadoReserva"\]/
  );
  assert.match(normalizador, /normalizeReservaDateTime\(reserva\)/);
  assert.match(normalizador, /fechaLabel: formatReservaDate\(fecha\)/);
  assert.match(normalizador, /horario: formatReservaHorario\(dateTime\)/);
  assert.match(normalizador, /entradaRegistrada: tieneEntradaRegistrada\(reserva\)/);
  assert.match(normalizador, /salidaRegistrada: tieneSalidaRegistrada\(reserva\)/);
  assert.match(normalizador, /raw: reserva/);
});

test("obtenerCampo conserva la busqueda anidada y sin distinguir mayusculas", () => {
  const obtenerCampo = entre("const obtenerCampo =", "const esValorVerdadero");

  assert.match(obtenerCampo, /item\?\.reserva/);
  assert.match(obtenerCampo, /item\?\.datos/);
  assert.match(obtenerCampo, /item\?\.data/);
  assert.match(obtenerCampo, /item\?\._doc/);
  assert.match(obtenerCampo, /item\?\.dataValues/);
  assert.match(obtenerCampo, /entryKey\.toLowerCase\(\) === key/);
  assert.match(obtenerCampo, /return fallback;/);
});

test("edita y copia usando la reserva original buscada por ID", () => {
  const mapa = entre("const reservasRawPorId = useMemo", "const reservasNormalizadas");
  assert.match(
    mapa,
    /new Map\(reservas\.map\(\(r\) => \[r\.id \?\? r\.id_reserva, r\]\)\)/
  );

  const click = entre("const handleReservaClick", "const handleCopyReserva");
  assert.match(click, /reservasRawPorId\.get\(reservaNorm\.id\)/);
  assert.match(click, /if \(raw\) \{/);
  assert.match(click, /setReservaEditando\(raw\)/);
  assert.match(click, /setReservaNormEditando\(reservaNorm\)/);

  const copia = entre("const handleCopyReserva", "const handleReservaActualizada");
  assert.match(copia, /if \(!raw\) return;/);
  assert.match(copia, /normalizeReservaDateTime\(raw\)/);
  assert.match(copia, /navigate\("\/nueva_reserva", \{/);
  assert.match(
    copia,
    /copiaReserva: \{ horaInicio, horaFin, idGarage, idVehiculo \}/
  );
});

test("el reporte del empleado envia solo id_usuario, descripcion y prioridad", () => {
  const payload = entre("await ConflictosCreate({", "});");

  assert.match(payload, /id_usuario: idUsuario/);
  assert.match(payload, /descripcion,/);
  assert.match(payload, /prioridad: prioridadReporte/);
  assert.doesNotMatch(payload, /SuperAdmin/);
  assert.doesNotMatch(payload, /\bestado\s*:/);
});

test("valida descripcion vacia, limite de 300 palabras e identificacion del usuario", () => {
  assert.match(source, /const MAX_PALABRAS = 300;/);

  const handler = entre(
    "const handleEnviarReporte",
    '<div className="empleado-dashboard-page">'
  );

  assert.match(handler, /const descripcion = descripcionReporte\.trim\(\)/);
  assert.match(handler, /if \(!descripcion\) \{/);
  assert.match(handler, /"Describi brevemente el problema\."/);
  assert.match(handler, /if \(contarPalabras\(descripcion\) > MAX_PALABRAS\) \{/);
  assert.match(
    handler,
    /La descripcion no puede tener mas de \$\{MAX_PALABRAS\} palabras\./
  );
  assert.match(handler, /if \(!Number\.isFinite\(idUsuario\)\) \{/);
  assert.match(handler, /"No se pudo identificar tu usuario\."/);
  assert.match(handler, /descripcion no puede tener mas de/);
});

test("mantiene el cierre exitoso del reporte a los 1600 ms y limpia el timer", () => {
  const handler = entre(
    "const handleEnviarReporte",
    '<div className="empleado-dashboard-page">'
  );

  assert.match(handler, /if \(resultado\.respuesta\) \{/);
  assert.match(handler, /setDescripcionReporte\(""\)/);
  assert.match(handler, /setPrioridadReporte\("Media"\)/);
  assert.match(handler, /"Mensaje enviado correctamente\."/);
  assert.match(
    handler,
    /reporteSuccessTimeoutRef\.current = setTimeout\(\(\) => \{[\s\S]*?\}, 1600\);/
  );
  assert.match(handler, /setModalReporteOpen\(false\)/);
  assert.match(
    handler,
    /resultado\.datos\?\.message \|\| "No se pudo enviar el reporte\."/
  );

  const cierre = entre("const cerrarModalReporte", "const handleEnviarReporte");
  assert.match(cierre, /if \(enviandoReporte\) return;/);
  assert.match(cierre, /clearTimeout\(reporteSuccessTimeoutRef\.current\)/);
  assert.match(cierre, /setModalReporteOpen\(false\)/);
  assert.match(cierre, /setDescripcionReporte\(""\)/);
  assert.match(cierre, /setPrioridadReporte\("Media"\)/);
  assert.match(cierre, /setMensajeReporte\(null\)/);

  assert.match(
    source,
    /useEffect\(\(\) => \{\s*return \(\) => \{\s*if \(reporteSuccessTimeoutRef\.current\) \{\s*clearTimeout\(reporteSuccessTimeoutRef\.current\);\s*\}\s*\};\s*\}, \[\]\);/
  );
});

test("mantiene clases, IDs, roles y atributos ARIA del modal de reporte", () => {
  assert.match(
    source,
    /import ModalReporteEmpleado from "\.\.\/componentesEmpleado\/modal_reporte_empleado";/
  );
  assert.match(source, /\{modalReporteOpen && \(\s*<ModalReporteEmpleado/);
  assert.match(source, /maxPalabras=\{MAX_PALABRAS\}/);
  assert.match(source, /contarPalabras=\{contarPalabras\}/);
  assert.match(source, /onSubmit=\{handleEnviarReporte\}/);
  assert.match(source, /onClose=\{cerrarModalReporte\}/);

  const modal = modalReporteSource;
  assert.match(modal, /className="empleado-reporte-overlay" role="presentation"/);
  assert.match(modal, /onMouseDown=\{onClose\}/);
  assert.match(modal, /className="empleado-reporte-modal"/);
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-labelledby="empleado-reporte-title"/);
  assert.match(modal, /id="empleado-reporte-title"/);
  assert.match(modal, /aria-label="Cerrar reporte"/);
  assert.match(modal, /className="empleado-reporte-form" onSubmit=\{onSubmit\}/);
  assert.match(modal, /className="empleado-reporte-field"/);
  assert.match(modal, /empleado-reporte-feedback--\$\{mensaje\.tipo\}/);
  assert.match(modal, /role="alert"/);
  assert.match(modal, /className="empleado-reporte-submit"/);
  assert.match(modal, /empleado-reporte-wordcount/);
  assert.match(
    modal,
    /\{contarPalabras\(descripcion\)\}\/\{maxPalabras\} palabras/
  );
  assert.match(modal, /disabled=\{enviando \|\| mensaje\?\.tipo === "success"\}/);
  assert.match(modal, /<option value="Baja">Baja<\/option>/);
  assert.match(modal, /<option value="Media">Media<\/option>/);
  assert.match(modal, /<option value="Alta">Alta<\/option>/);
  assert.match(modal, /<span>Soporte<\/span>/);
  assert.match(modal, /Reportar problema/);
  assert.match(modal, /placeholder="Contanos que paso"/);
  assert.match(modal, /Enviando\.\.\./);
  assert.match(modal, /Enviar reporte/);
});

test("mantiene la visibilidad y el tipo de QR de las reservas", () => {
  assert.match(
    source,
    /import \{ obtenerTipoQrReserva, puedeMostrarQrReserva \} from "\.\.\/helpers\/qrReserva";/
  );
  assert.match(source, /mostrarQr=\{puedeMostrarQrReserva\(reservaPrincipal\)\}/);
  assert.match(source, /tipoQr=\{obtenerTipoQrReserva\(reservaPrincipal\)\}/);
  assert.match(source, /mostrarQr=\{puedeMostrarQrReserva\(reserva\)\}/);
  assert.match(source, /tipoQr=\{obtenerTipoQrReserva\(reserva\)\}/);
  assert.match(
    source,
    /const reservaQrActiva = reservasNormalizadas\.find\(\(reserva\) => Number\(reserva\.id\) === Number\(reservaQrId\)\) \?\? null;/
  );

  const modalQr = entre(
    "{reservaQrId !== null && reservaQrActiva ? (",
    "export default EmpleadoDashboard"
  );
  assert.match(modalQr, /idReserva=\{reservaQrId\}/);
  assert.match(modalQr, /tipo=\{obtenerTipoQrReserva\(reservaQrActiva\)\}/);
  assert.match(modalQr, /onClose=\{\(\) => setReservaQrId\(null\)\}/);
});

test("carga vehiculos, garages, perfil, modelos y marcas en una sola fase", () => {
  const carga = entre(
    "const cargarDatosEmpleado = async () => {",
    "cargarDatosEmpleado();"
  );

  assert.match(
    carga,
    /const \[vehiculosResponse, garagesResponse, usuarioResponse, modelosResponse, marcasResponse\] = await Promise\.all\(\[/
  );
  assert.match(carga, /VehiculosGetAll\(\)/);
  assert.match(carga, /GaragesGetAll\(\)/);
  assert.match(
    carga,
    /Number\.isFinite\(idUsuario\) \? UsuariosGetById\(idUsuario\) : Promise\.resolve\(\{ respuesta: false, datos: null \}\)/
  );
  assert.match(carga, /ModelosGetAll\(\)/);
  assert.match(carga, /MarcasGetAll\(\)/);
  assert.match(
    carga,
    /const perfilUsuarioApi = usuarioResponse\.respuesta \? obtenerObjeto\(usuarioResponse\.datos\) : null/
  );
  assert.match(carga, /const perfilEmpleado = perfilUsuarioApi \|\| usuario/);
  assert.match(
    carga,
    /\.filter\(\(vehiculo\) => Number\(vehiculo\.id_usuario \?\? vehiculo\.idUsuario \?\? vehiculo\.usuario_id\) === idUsuario\)/
  );
  assert.match(
    carga,
    /const idSedeEmpleado = Number\(obtenerIdSedeUsuario\(perfilEmpleado\)\)/
  );
  assert.match(
    carga,
    /const garagesDeSede = Number\.isFinite\(idSedeEmpleado\)\s*\? garages\.filter\(esGarageActivo\)\s*: \[\]/
  );
  assert.match(carga, /setVehiculos\(vehiculosDelUsuario\)/);
  assert.match(carga, /setGarages\(garages\)/);
  assert.match(carga, /setGaragesSede\(garagesDeSede\)/);
  assert.match(carga, /setModelos\(/);
  assert.match(carga, /setMarcas\(/);
  assert.match(carga, /if \(!montado\) return;/);
  assert.match(carga, /"No se pudieron cargar todos tus datos\."/);
  assert.match(carga, /"No se pudo identificar tu sede\."/);
  assert.match(carga, /"No hay garages disponibles para tu sede\."/);
});
