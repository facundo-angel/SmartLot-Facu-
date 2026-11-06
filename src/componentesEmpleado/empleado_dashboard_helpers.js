import { normalizeReservaDateTime, formatReservaDate, formatReservaMonth, formatReservaHorario } from "../helpers/reservaDateTime";

export const MAX_PALABRAS = 300;
export const contarPalabras = (texto) => (texto || "").trim().split(/\s+/).filter(Boolean).length;

export const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.reservas)) return datos.reservas;
  if (Array.isArray(datos?.vehiculos)) return datos.vehiculos;
  if (Array.isArray(datos?.garages)) return datos.garages;
  if (Array.isArray(datos?.value)) return datos.value;
  return [];
};

export const obtenerIdUsuario = (usuario) =>
  usuario?.id ??
  usuario?.id_usuario ??
  usuario?.idUsuario ??
  usuario?._id ??
  usuario?.usuario?.id_usuario ??
  usuario?.usuario?.idUsuario ??
  usuario?.usuario?.id ??
  usuario?.datos?.id_usuario ??
  usuario?.datos?.idUsuario ??
  usuario?.datos?.id;
export const obtenerIdVehiculo = (vehiculo) => vehiculo?.id ?? vehiculo?.id_vehiculo ?? vehiculo?._id;
export const obtenerIdGarage = (item) => item?.id_garage ?? item?.idGarage ?? item?.garage_id ?? item?.garageId ?? item?.garage?.id_garage ?? item?.garage?.id ?? item?.id;
export const obtenerIdGarageAsignado = (item) =>
  item?.id_garage ??
  item?.idGarage ??
  item?.garage_id ??
  item?.garageId ??
  item?.garage?.id_garage ??
  item?.garage?.idGarage ??
  item?.garage?.id;
export const obtenerIdSedeUsuario = (item) =>
  item?.id_sede ??
  item?.idSede ??
  item?.sede_id ??
  item?.sedeId ??
  item?.sede?.id ??
  item?.sede?.id_sede ??
  item?.usuario?.id_sede ??
  item?.usuario?.idSede ??
  item?.datos?.id_sede ??
  item?.datos?.idSede;

export const esGarageActivo = (garage) => {
  const estado = garage?.estado ?? garage?.activo ?? garage?.status;

  if (estado === undefined || estado === null || estado === "") return true;
  if (typeof estado === "boolean") return estado;
  if (typeof estado === "number") return estado === 1;

  if (typeof estado === "string") {
    const estadoNormalizado = estado.trim().toLowerCase();
    return ["true", "activo", "activa", "abierto", "habilitado", "1"].includes(estadoNormalizado);
  }

  return true;
};

export const obtenerHoraApertura = (garage) => obtenerCampo(garage, ["hora_apertura", "horaApertura", "apertura"], "");
export const obtenerHoraCierre = (garage) => obtenerCampo(garage, ["hora_cierre", "horaCierre", "cierre"], "");

export const obtenerObjeto = (datos) => {
  if (!datos || Array.isArray(datos)) return null;
  return datos.usuario ?? datos.datos ?? datos.data ?? datos;
};

export const esNombreGenerico = (valor) => {
  const normalizado = String(valor || "").trim().toLowerCase();
  return ["empleado", "admin", "administrador", "garagista", "usuario"].includes(normalizado);
};

export const obtenerNombreUsuario = (usuario) => {
  const nombre = esNombreGenerico(usuario?.nombre) ? "" : usuario?.nombre;
  const nombreCompleto = [nombre, usuario?.apellido].filter(Boolean).join(" ").trim();
  const identificador =
    nombreCompleto ||
    usuario?.nombre_usuario ||
    usuario?.nombreUsuario ||
    usuario?.username ||
    usuario?.email?.split("@")[0];

  return identificador || "";
};

export const obtenerCampo = (item, claves, fallback = "") => {
  const origenes = [
    item,
    item?.reserva,
    item?.datos,
    item?.data,
    item?._doc,
    item?.dataValues,
  ];

  for (const origen of origenes) {
    const clave = claves.find((key) => origen?.[key] !== undefined && origen?.[key] !== null && origen?.[key] !== "");
    if (clave) return origen[clave];

    if (origen && typeof origen === "object") {
      const entries = Object.entries(origen);
      const claveNormalizada = claves
        .map((key) => key.toLowerCase())
        .find((key) => entries.some(([entryKey, value]) =>
          entryKey.toLowerCase() === key && value !== undefined && value !== null && value !== ""
        ));
      if (claveNormalizada) {
        const entry = entries.find(([entryKey]) => entryKey.toLowerCase() === claveNormalizada);
        if (entry) return entry[1];
      }
    }
  }

  return fallback;
};

export const esValorVerdadero = (valor) => {
  if (valor === true || valor === 1) return true;
  if (valor === false || valor === 0 || valor == null) return false;
  if (typeof valor !== "string") return false;

  const texto = valor.trim().toLowerCase();
  if (!texto || ["false", "0", "no", "null", "undefined"].includes(texto)) return false;
  if (["true", "1", "si", "sí", "completo", "completado"].includes(texto)) return true;
  return !Number.isNaN(new Date(valor).getTime());
};

// El endpoint de reservas por usuario devuelve tambien las reservas con
// borrado logico (soft delete) para el historial: hay que excluirlas aca,
// sino la reserva cancelada reaparece como tarjeta fantasma en el poll.
export const esReservaCancelada = (reserva) =>
  [
    reserva?.borrado,
    reserva?.Borrado,
    reserva?.cancelada,
    reserva?.cancelado,
    reserva?.eliminada,
    reserva?.eliminado,
    reserva?.deleted,
    reserva?.deleted_at,
    reserva?.deletedAt,
  ].some(Boolean) ||
  ["cancelada", "cancelado", "borrada", "borrado", "eliminada", "eliminado", "canceled", "cancelled"].includes(
    String(reserva?.estado ?? reserva?.estado_reserva ?? reserva?.status ?? "")
      .trim().toLowerCase().replace(/[\s-]+/g, "_")
  );

export const tieneSalidaRegistrada = (reserva) =>
  [
    obtenerCampo(reserva, ["salida", "egreso", "check_out", "checkOut", "salio"]),
    obtenerCampo(reserva, ["salida_registrada", "salidaRegistrada"]),
    obtenerCampo(reserva, ["fecha_salida_real", "fechaSalidaReal"]),
    obtenerCampo(reserva, ["hora_salida_real", "horaSalidaReal"]),
  ].some(esValorVerdadero);

export const tieneEntradaRegistrada = (reserva) =>
  [
    obtenerCampo(reserva, ["entrada", "ingreso", "check_in", "checkIn", "entro"]),
    obtenerCampo(reserva, ["entrada_registrada", "entradaRegistrada"]),
    obtenerCampo(reserva, ["fecha_entrada_real", "fechaEntradaReal"]),
    obtenerCampo(reserva, ["hora_entrada_real", "horaEntradaReal"]),
    obtenerCampo(reserva, ["fecha_ingreso", "fechaIngreso"]),
    obtenerCampo(reserva, ["hora_ingreso", "horaIngreso"]),
    obtenerCampo(reserva, ["ingreso_at", "ingresoAt"]),
    obtenerCampo(reserva, ["ingreso_exitoso", "ingresoExitoso", "esta_dentro", "estaDentro"]),
  ].some(esValorVerdadero) || ["dentro", "ingresado", "ingresada", "adentro", "ocupado", "ocupada", "ingreso", "en_curso", "dentro_garage", "checkin", "check_in"].includes(
    String(obtenerCampo(reserva, ["estado", "status", "estado_reserva", "estadoReserva"], ""))
      .trim().toLowerCase().replace(/[\s-]+/g, "_")
  );

export const obtenerNombreGarage = (garage) =>
  garage
    ? obtenerCampo(garage, ["nombre", "name", "descripcion", "ubicacion", "nombre_garage", "garage_nombre", "nombre_zona", "direccion"], "Garage")
    : "";

export const normalizarReserva = (reserva, vehiculosPorId, garagesPorId, modelosPorId, marcasPorId) => {
  const idVehiculo = obtenerCampo(reserva, ["id_vehiculo", "idVehiculo", "vehiculo_id", "vehiculoId"]);
  const idGarage = obtenerIdGarageAsignado(reserva);
  const vehiculo = vehiculosPorId.get(Number(idVehiculo));
  const garageReserva = garagesPorId.get(Number(idGarage));
  const patente = obtenerCampo(vehiculo, ["patente", "placa", "matricula"]);
  const idModelo = Number(obtenerCampo(vehiculo, ["id_modelo", "idModelo", "modelo_id"]));
  const modeloObj = modelosPorId.get(idModelo);
  const modelo = modeloObj?.nombre || "";
  const marcaNombre = marcasPorId.get(Number(modeloObj?.id_marca))?.nombre || "";
  const dateTime = normalizeReservaDateTime(reserva);
  const { fecha, hora_entrada: horaInicio, hora_salida: horaFin } = dateTime;
  const fechaEntradaCruda = dateTime.fecha_entrada;
  const fechaSalidaCruda = dateTime.fecha_salida;
  const ubicacion = obtenerCampo(reserva, ["ubicacion", "sede", "nombre_sede", "nombre_garage", "garage_nombre"], "") ||
    obtenerNombreGarage(garageReserva) ||
    "Garage asignado";

  const plaza = obtenerCampo(reserva, ["plaza", "nro_plaza", "numero_plaza", "espacio"], patente || "Auto");
  const zona = obtenerCampo(reserva, ["nombre_zona", "nivel", "piso", "sector", "zona"], "Reserva");

  return {
    id: reserva.id ?? reserva.id_reserva ?? `${fecha}-${idVehiculo}-${horaInicio}`,
    fecha,
    fechaLabel: formatReservaDate(fecha),
    horario: formatReservaHorario(dateTime),
    ubicacion,
    plaza,
    nivel: zona,
    nombre_garage: ubicacion,
    nro_plaza: fecha ? fecha.slice(8, 10) : "-",
    nombre_zona: formatReservaMonth(fecha),
    hora_entrada: horaInicio,
    hora_salida: horaFin,
    entradaRegistrada: tieneEntradaRegistrada(reserva),
    salidaRegistrada: tieneSalidaRegistrada(reserva),
    fechaEntradaCruda,
    fechaSalidaCruda,
    estado: obtenerCampo(reserva, ["estado", "status", "estado_reserva", "estadoReserva"], "confirmada"),
    vehiculo: vehiculo ? { patente, marca: marcaNombre, modelo } : reserva.vehiculo ?? null,
    raw: reserva,
  };
};

export const indexarPorId = (items, claves) =>
  new Map(
    items.map((item) => [
      Number(claves.reduce((valor, clave) => valor ?? item?.[clave], undefined)),
      item,
    ])
  );
