import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const dashboardPath = new URL("./garagista_dashboard.jsx", import.meta.url);

const sourcePaths = [
  dashboardPath,
  new URL("../componentesGaragista/control_acceso_helpers.js", import.meta.url),
  new URL("../componentesGaragista/badge_estado.jsx", import.meta.url),
  new URL("../componentesGaragista/tarjeta_acceso.jsx", import.meta.url),
  new URL("../componentesGaragista/garagista_paneles.jsx", import.meta.url),
  new URL("../componentesGaragista/garagista_movimientos.jsx", import.meta.url),
  new URL("../componentesGaragista/modal_verificacion_acceso.jsx", import.meta.url),
  new URL("../componentesGaragista/garagista_encabezado.jsx", import.meta.url),
  new URL("../componentesGaragista/garagista_dashboard_skeleton.jsx", import.meta.url),
];

const leerFuentes = async () => {
  const fuentes = await Promise.all(sourcePaths.map((path) => readFile(path, "utf8")));
  return fuentes.join("\n");
};

test("el dashboard no muestra ni mapea una plaza", async () => {
  const source = await leerFuentes();
  assert.doesNotMatch(source, /nro_plaza|reserva\.plaza|>Plaza</i);
});

test("Autos dentro abre la verificación de salida sin mostrar la patente", async () => {
  const source = await leerFuentes();
  assert.match(source, /abrirVerificacionSalida\(reserva\)/);
  assert.match(source, /setLectorQrAbierto\("salida"\)/);
  assert.match(source, />\s*Patente manual\s*</);
  assert.match(source, /tipoVerificacion === "ingreso" \? <small>Patente/);
});

test("la salida contempla patente incorrecta, confirmación y error del servidor", async () => {
  const source = await leerFuentes();
  assert.match(source, /La patente ingresada no coincide con el vehículo registrado/);
  assert.match(source, /ReservasCheckOut\(reservaSeleccionada\.id, patenteIngresada\)/);
  assert.match(source, /Confirmar salida/);
  assert.match(source, /No se pudo registrar la salida en el servidor/);
});

test("mapea la hora real de entrada tanto en snake_case como camelCase", async () => {
  const source = await leerFuentes();
  assert.match(source, /reserva\.fecha_entrada_real/);
  assert.match(source, /reserva\.fechaEntradaReal/);
  assert.match(source, /reserva\.hora_entrada_real/);
  assert.match(source, /reserva\.horaEntradaReal/);
  assert.match(source, /reserva\.hora_ingreso/);
  assert.match(source, /horaEntrada: obtenerHoraEntradaReal\(r\)/);
});

test("Últimos movimientos muestra la hora real de salida", async () => {
  const source = await leerFuentes();
  assert.match(source, /reserva\.fecha_salida_real/);
  assert.match(source, /reserva\.fechaSalidaReal/);
  assert.match(source, /reserva\.salida/);
  assert.match(source, /reserva\.hora_egreso/);
  assert.match(source, /reserva\.horaSalida \? \(\s*<span>Salida real/);
  assert.doesNotMatch(source, /Salida real \{reserva\.horaSalida \|\| "--:--"\}/);
});

test("control de acceso usa el endpoint acotado y envía la patente al backend", async () => {
  const source = await leerFuentes();
  assert.match(source, /ReservasGetControlAcceso\(idGarageAsignado, fechaISOActual/);
  assert.match(source, /ReservasCheckIn\(reservaSeleccionada\.id, patenteIngresada\)/);
  assert.match(source, /ReservasCheckOut\(reservaSeleccionada\.id, patenteIngresada\)/);
  assert.doesNotMatch(source, /UsuariosGetAll|VehiculosGetAll|ReservasGetAll/);
});

test("actualiza la fecha del tablero sin recargar la página", async () => {
  const source = await leerFuentes();
  assert.match(source, /setInterval\(actualizarFecha, 60 \* 1000\)/);
  assert.match(source, /addEventListener\("focus", actualizarFecha\)/);
  assert.match(source, /addEventListener\("visibilitychange", actualizarFecha\)/);
});

test("reconoce como Dentro los estados y campos devueltos por el check-in QR", async () => {
  const source = await leerFuentes();
  assert.match(source, /reserva\.estado_reserva/);
  assert.match(source, /"dentro", "ingresado", "ingresada", "adentro", "ocupado"/);
  assert.match(source, /reserva\.fecha_ingreso/);
  assert.match(source, /reserva\.ingreso_at/);
});

test("mantiene visibles los autos dentro aunque la fecha devuelta sea la del ingreso", async () => {
  const source = await leerFuentes();
  assert.match(source, /reserva\.fechaReserva !== fechaISOActual && reserva\.estado !== "Dentro"/);
});

test("mantiene el ingreso manual por patente y agrega el lector QR solo para garagistas", async () => {
  const source = await leerFuentes();
  assert.match(source, /setLectorQrAbierto\("ingreso"\)/);
  assert.match(source, /setLectorQrAbierto\("salida"\)/);
  assert.match(source, /Patente manual/);
  assert.match(source, /ReservasCheckIn\(reservaSeleccionada\.id, patenteIngresada\)/);
  assert.match(source, /!esAdmin \? \([\s\S]*Escanear QR/);
  assert.match(source, /<LectorQrReserva/);
  assert.match(source, /onSalidaExitosa/);
});

test("tras un ingreso QR solicita una recarga real de las reservas", async () => {
  const source = await leerFuentes();
  assert.match(source, /setRecargaReservas\(\(actual\) => actual \+ 1\)/);
  assert.match(source, /\[fechaISOActual, idGarageAsignado, recargaReservas\]/);
  assert.match(source, /ReservasGetControlAcceso\(idGarageAsignado, fechaISOActual, \{ force: true \}\)/);
  assert.match(source, /estado: "Dentro"/);
  assert.match(source, /obtenerReservaResultadoQr\(datosIngreso\)/);
});
