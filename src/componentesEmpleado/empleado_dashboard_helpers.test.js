import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PALABRAS,
  contarPalabras,
  obtenerListado,
  obtenerIdUsuario,
  obtenerIdVehiculo,
  obtenerIdGarage,
  obtenerIdGarageAsignado,
  obtenerIdSedeUsuario,
  esGarageActivo,
  obtenerHoraApertura,
  obtenerHoraCierre,
  obtenerObjeto,
  esNombreGenerico,
  obtenerNombreUsuario,
  obtenerCampo,
  esValorVerdadero,
  esReservaCancelada,
  tieneSalidaRegistrada,
  tieneEntradaRegistrada,
  obtenerNombreGarage,
  normalizarReserva,
  indexarPorId,
} from "./empleado_dashboard_helpers.js";

test("el limite del reporte es de 300 palabras y cuenta correctamente", () => {
  assert.equal(MAX_PALABRAS, 300);
  assert.equal(contarPalabras(""), 0);
  assert.equal(contarPalabras("   uno   dos\n tres  "), 3);
  assert.equal(contarPalabras(null), 0);
});

test("obtenerListado reconoce los envoltorios de la API", () => {
  assert.deepEqual(obtenerListado([1, 2]), [1, 2]);
  assert.deepEqual(obtenerListado({ datos: [1] }), [1]);
  assert.deepEqual(obtenerListado({ data: [2] }), [2]);
  assert.deepEqual(obtenerListado({ reservas: [3] }), [3]);
  assert.deepEqual(obtenerListado({ vehiculos: [4] }), [4]);
  assert.deepEqual(obtenerListado({ garages: [5] }), [5]);
  assert.deepEqual(obtenerListado({ value: [6] }), [6]);
  assert.deepEqual(obtenerListado({ otro: [7] }), []);
});

test("obtenerIdUsuario respeta el orden de aliases y los objetos anidados", () => {
  assert.equal(obtenerIdUsuario({ id: 1, id_usuario: 2 }), 1);
  assert.equal(obtenerIdUsuario({ id_usuario: 2, idUsuario: 3 }), 2);
  assert.equal(obtenerIdUsuario({ idUsuario: 3, _id: 4 }), 3);
  assert.equal(obtenerIdUsuario({ _id: 4 }), 4);
  assert.equal(obtenerIdUsuario({ usuario: { id_usuario: 5 } }), 5);
  assert.equal(obtenerIdUsuario({ datos: { id: 6 } }), 6);
  assert.equal(obtenerIdUsuario({}), undefined);
});

test("obtenerIdVehiculo reconoce id, id_vehiculo y _id", () => {
  assert.equal(obtenerIdVehiculo({ id: 1, id_vehiculo: 2 }), 1);
  assert.equal(obtenerIdVehiculo({ id_vehiculo: 2, _id: 3 }), 2);
  assert.equal(obtenerIdVehiculo({ _id: 3 }), 3);
  assert.equal(obtenerIdVehiculo({}), undefined);
});

test("obtenerIdGarage y obtenerIdGarageAsignado no son intercambiables", () => {
  assert.equal(obtenerIdGarage({ id: 9 }), 9);
  assert.equal(obtenerIdGarageAsignado({ id: 9 }), undefined);

  assert.equal(obtenerIdGarage({ garage: { idGarage: 7 } }), undefined);
  assert.equal(obtenerIdGarageAsignado({ garage: { idGarage: 7 } }), 7);

  assert.equal(obtenerIdGarage({ garage: { id: 7 } }), 7);
  assert.equal(obtenerIdGarageAsignado({ garage: { id: 7 } }), 7);

  assert.equal(obtenerIdGarage({ id_garage: 1, idGarage: 2 }), 1);
  assert.equal(obtenerIdGarageAsignado({ garage_id: 3, garageId: 4 }), 3);
});

test("obtenerIdSedeUsuario busca sede, usuario y datos", () => {
  assert.equal(obtenerIdSedeUsuario({ id_sede: 1, sede_id: 2 }), 1);
  assert.equal(obtenerIdSedeUsuario({ sedeId: 3 }), 3);
  assert.equal(obtenerIdSedeUsuario({ sede: { id_sede: 4 } }), 4);
  assert.equal(obtenerIdSedeUsuario({ usuario: { idSede: 5 } }), 5);
  assert.equal(obtenerIdSedeUsuario({ datos: { id_sede: 6 } }), 6);
  assert.equal(obtenerIdSedeUsuario({}), undefined);
});

test("obtenerCampo conserva la busqueda anidada, la comparacion sin mayusculas y el fallback", () => {
  assert.equal(obtenerCampo({ reserva: { estado: "confirmada" } }, ["estado"]), "confirmada");
  assert.equal(obtenerCampo({ datos: { patente: "AA123BB" } }, ["patente"]), "AA123BB");
  assert.equal(obtenerCampo({ data: { id: 2 } }, ["id"]), 2);
  assert.equal(obtenerCampo({ _doc: { plaza: "A1" } }, ["plaza"]), "A1");
  assert.equal(obtenerCampo({ dataValues: { nivel: "Piso 2" } }, ["nivel"]), "Piso 2");
  assert.equal(obtenerCampo({ BAR: 7 }, ["bar"]), 7);
  assert.equal(obtenerCampo({ id: 1, id_reserva: 2 }, ["id_reserva", "id"]), 2);
  assert.equal(obtenerCampo({ foo: "" }, ["foo"], "NA"), "NA");
  assert.equal(obtenerCampo({ foo: null }, ["foo"], "NA"), "NA");
  assert.equal(obtenerCampo({}, ["foo"], "NA"), "NA");
});

test("esGarageActivo interpreta booleanos, numeros y strings", () => {
  assert.equal(esGarageActivo({}), true);
  assert.equal(esGarageActivo({ estado: "" }), true);
  assert.equal(esGarageActivo({ estado: true }), true);
  assert.equal(esGarageActivo({ activo: false }), false);
  assert.equal(esGarageActivo({ estado: 1 }), true);
  assert.equal(esGarageActivo({ estado: 0 }), false);
  assert.equal(esGarageActivo({ estado: " ACTIVO " }), true);
  assert.equal(esGarageActivo({ status: "Habilitado" }), true);
  assert.equal(esGarageActivo({ estado: "cerrado" }), false);
  assert.equal(esGarageActivo({ estado: 2 }), false);
});

test("obtenerHoraApertura y obtenerHoraCierre usan aliases y fallback vacio", () => {
  assert.equal(obtenerHoraApertura({ hora_apertura: "08:00" }), "08:00");
  assert.equal(obtenerHoraApertura({ horaApertura: "09:00" }), "09:00");
  assert.equal(obtenerHoraApertura({ apertura: "07:30" }), "07:30");
  assert.equal(obtenerHoraApertura({}), "");
  assert.equal(obtenerHoraCierre({ hora_cierre: "18:00" }), "18:00");
  assert.equal(obtenerHoraCierre({ cierre: "20:00" }), "20:00");
  assert.equal(obtenerHoraCierre({}), "");
});

test("obtenerObjeto extrae el perfil de las envolturas", () => {
  assert.deepEqual(obtenerObjeto({ datos: { id: 1 } }), { id: 1 });
  assert.deepEqual(obtenerObjeto({ usuario: { id: 2 } }), { id: 2 });
  assert.deepEqual(obtenerObjeto({ data: { id: 3 } }), { id: 3 });
  assert.deepEqual(obtenerObjeto({ id: 4 }), { id: 4 });
  assert.equal(obtenerObjeto([{ id: 5 }]), null);
  assert.equal(obtenerObjeto(null), null);
});

test("obtenerNombreUsuario descarta nombres genericos y usa identificadores", () => {
  assert.equal(obtenerNombreUsuario({ nombre: "Juan", apellido: "Perez" }), "Juan Perez");
  assert.equal(obtenerNombreUsuario({ nombre: "Empleado", apellido: "Perez" }), "Perez");
  assert.equal(obtenerNombreUsuario({ nombre_usuario: "jperez" }), "jperez");
  assert.equal(obtenerNombreUsuario({ username: "juan" }), "juan");
  assert.equal(obtenerNombreUsuario({ email: "juan@mail.com" }), "juan");
  assert.equal(obtenerNombreUsuario({ nombre: "Admin" }), "");
  assert.equal(obtenerNombreUsuario({}), "");
  assert.equal(esNombreGenerico(" ADMIN "), true);
  assert.equal(esNombreGenerico("Juan"), false);
});

test("esValorVerdadero acepta booleanos, afirmativos y fechas validas", () => {
  assert.equal(esValorVerdadero(true), true);
  assert.equal(esValorVerdadero(1), true);
  assert.equal(esValorVerdadero(false), false);
  assert.equal(esValorVerdadero(0), false);
  assert.equal(esValorVerdadero(null), false);
  assert.equal(esValorVerdadero(undefined), false);
  assert.equal(esValorVerdadero("si"), true);
  assert.equal(esValorVerdadero("SÍ"), true);
  assert.equal(esValorVerdadero("completado"), true);
  assert.equal(esValorVerdadero("2026-01-01"), true);
  assert.equal(esValorVerdadero("no"), false);
  assert.equal(esValorVerdadero("false"), false);
  assert.equal(esValorVerdadero(""), false);
  assert.equal(esValorVerdadero(7), false);
});

test("esReservaCancelada detecta flags y estados normalizados", () => {
  assert.equal(esReservaCancelada({ borrado: true }), true);
  assert.equal(esReservaCancelada({ deleted_at: "2026-01-01" }), true);
  assert.equal(esReservaCancelada({ estado: "Cancelada" }), true);
  assert.equal(esReservaCancelada({ estado_reserva: "CANCELLED" }), true);
  assert.equal(esReservaCancelada({ status: " BORRADO " }), true);
  assert.equal(esReservaCancelada({ status: "en curso" }), false);
  assert.equal(esReservaCancelada({}), false);
});

test("tieneEntradaRegistrada y tieneSalidaRegistrada cubren aliases y estados", () => {
  assert.equal(tieneEntradaRegistrada({ entrada: true }), true);
  assert.equal(tieneEntradaRegistrada({ check_in: "2026-01-01" }), true);
  assert.equal(tieneEntradaRegistrada({ ingreso_exitoso: false }), false);
  assert.equal(tieneEntradaRegistrada({ estado: "Dentro" }), true);
  assert.equal(tieneEntradaRegistrada({ estado: "en curso" }), true);
  assert.equal(tieneEntradaRegistrada({}), false);

  assert.equal(tieneSalidaRegistrada({ salida: true }), true);
  assert.equal(tieneSalidaRegistrada({ salida_registrada: true }), true);
  assert.equal(tieneSalidaRegistrada({ check_out: "2026-01-02" }), true);
  assert.equal(tieneSalidaRegistrada({}), false);
});

test("obtenerNombreGarage usa aliases y el fallback Garage", () => {
  assert.equal(obtenerNombreGarage(null), "");
  assert.equal(obtenerNombreGarage({ nombre: "Central" }), "Central");
  assert.equal(obtenerNombreGarage({ nombre_garage: "Norte" }), "Norte");
  assert.equal(obtenerNombreGarage({ direccion: "Av. Siempre Viva" }), "Av. Siempre Viva");
  assert.equal(obtenerNombreGarage({}), "Garage");
});

test("normalizarReserva arma la tarjeta con los maps y conserva el raw", () => {
  const reserva = {
    id: 5,
    id_vehiculo: 1,
    id_garage: 2,
    fecha: "2026-11-20",
    hora_entrada: "08:00",
    hora_salida: "10:00",
    nombre_zona: "Piso 1",
    estado: "confirmada",
  };
  const vehiculosPorId = new Map([[1, { patente: "AA123BB", id_modelo: 10 }]]);
  const garagesPorId = new Map([[2, { nombre: "Garage Central" }]]);
  const modelosPorId = new Map([[10, { nombre: "Fiat", id_marca: 20 }]]);
  const marcasPorId = new Map([[20, { nombre: "Fiat" }]]);

  const normalizada = normalizarReserva(reserva, vehiculosPorId, garagesPorId, modelosPorId, marcasPorId);

  assert.equal(normalizada.id, 5);
  assert.equal(normalizada.fecha, "2026-11-20");
  assert.equal(normalizada.fechaLabel, "20/11/2026");
  assert.equal(normalizada.horario, "08:00 a 10:00");
  assert.equal(normalizada.nombre_zona, "noviembre");
  assert.equal(normalizada.ubicacion, "Garage Central");
  assert.equal(normalizada.nombre_garage, "Garage Central");
  assert.equal(normalizada.plaza, "AA123BB");
  assert.equal(normalizada.nivel, "Piso 1");
  assert.equal(normalizada.estado, "confirmada");
  assert.deepEqual(normalizada.vehiculo, { patente: "AA123BB", marca: "Fiat", modelo: "Fiat" });
  assert.equal(normalizada.entradaRegistrada, false);
  assert.equal(normalizada.salidaRegistrada, false);
  assert.equal(normalizada.fechaEntradaCruda, "2026-11-20T08:00:00");
  assert.equal(normalizada.fechaSalidaCruda, "2026-11-20T10:00:00");
  assert.equal(normalizada.raw, reserva);
});

test("normalizarReserva mantiene los fallbacks con datos incompletos", () => {
  const reserva = {};
  const normalizada = normalizarReserva(reserva, new Map(), new Map(), new Map(), new Map());

  assert.equal(normalizada.ubicacion, "Garage asignado");
  assert.equal(normalizada.plaza, "Auto");
  assert.equal(normalizada.nivel, "Reserva");
  assert.equal(normalizada.estado, "confirmada");
  assert.equal(normalizada.vehiculo, null);
  assert.equal(normalizada.nro_plaza, "-");
  assert.equal(normalizada.raw, reserva);
});

test("indexarPorId usa el primer alias disponible", () => {
  const mapa = indexarPorId([{ id_modelo: 7, nombre: "X" }, { id: 8, nombre: "Y" }], ["id", "id_modelo"]);
  assert.equal(mapa.get(7).nombre, "X");
  assert.equal(mapa.get(8).nombre, "Y");
});
