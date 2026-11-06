export const MENSAJE_INGRESO_ANTICIPADO =
  "No se puede ingresar el vehículo hasta una hora antes del horario pautado de la reserva.";

export const MINUTOS_ANTICIPACION_INGRESO = 60;

export const obtenerHoraActual = () =>
  new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export const obtenerFechaActual = () =>
  new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

export const obtenerFechaISOActual = () =>
  new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

const tieneZonaHoraria = (valor) => /(?:Z|[+-]\d{2}:?\d{2})$/.test(String(valor).trim());

const extraerFecha = (valor) => {
  if (!valor) return "";
  const texto = String(valor);
  if (tieneZonaHoraria(texto)) {
    const fecha = new Date(texto);
    if (!Number.isNaN(fecha.getTime())) {
      return new Intl.DateTimeFormat("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(fecha);
    }
  }

  const coincidencia = texto.match(/^\d{4}-\d{2}-\d{2}/);
  if (coincidencia) return coincidencia[0];

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
};

const obtenerFechaReserva = (reserva) => {
  const candidatos = [
    reserva.fecha_entrada,
    reserva.fechaEntrada,
    reserva.fecha_inicio,
    reserva.fechaInicio,
    reserva.fecha,
    reserva.fecha_reserva,
    reserva.fechaReserva,
  ];

  for (const candidato of candidatos) {
    const fecha = extraerFecha(candidato);
    if (fecha) return fecha;
  }
  return "";
};

export const obtenerIdGarage = (garage) =>
  garage?.id_garage ?? garage?.idGarage ?? garage?.garage_id ?? garage?.id ?? garage?._id;

export const obtenerIdReserva = (reserva) =>
  reserva?.id_reserva ?? reserva?.id ?? reserva?._id;

export const obtenerReservaResultadoQr = (datos) => {
  const candidatos = [datos?.reserva, datos?.data?.reserva, datos?.data, datos?.datos, datos];
  return candidatos.find((item) => item && typeof item === "object" && !Array.isArray(item) && obtenerIdReserva(item)) ?? null;
};

export const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.reservas)) return datos.reservas;
  if (Array.isArray(datos?.usuarios)) return datos.usuarios;
  return [];
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

export const normalizarEstadoReserva = (reserva) => {
  const estadoExplicito = String(
    reserva.estado ?? reserva.status ?? reserva.estado_reserva ?? reserva.estadoReserva ?? ""
  ).trim().toLowerCase().replace(/[\s-]+/g, "_");
  const entro = [
    reserva.entrada,
    reserva.ingreso,
    reserva.check_in,
    reserva.checkIn,
    reserva.entro,
    reserva.entrada_registrada,
    reserva.entradaRegistrada,
    reserva.fecha_entrada_real,
    reserva.fechaEntradaReal,
    reserva.fecha_ingreso,
    reserva.fechaIngreso,
    reserva.hora_ingreso,
    reserva.horaIngreso,
    reserva.ingreso_at,
    reserva.ingresoAt,
    reserva.ingreso_exitoso,
    reserva.ingresoExitoso,
    reserva.esta_dentro,
    reserva.estaDentro,
    reserva.movimiento?.fecha_entrada,
    reserva.movimiento?.fechaIngreso,
  ].some(esValorVerdadero);
  const salio = [
    reserva.salida,
    reserva.egreso,
    reserva.check_out,
    reserva.checkOut,
    reserva.salio,
    reserva.salida_registrada,
    reserva.salidaRegistrada,
    reserva.fecha_salida_real,
    reserva.fechaSalidaReal,
    reserva.fecha_egreso,
    reserva.fechaEgreso,
    reserva.hora_egreso,
    reserva.horaEgreso,
    reserva.egreso_at,
    reserva.egresoAt,
  ].some(esValorVerdadero);

  if (salio || ["finalizado", "finalizada", "completado", "completada", "fuera", "checkout", "check_out"].includes(estadoExplicito)) {
    return "Finalizado";
  }
  if (entro || ["dentro", "ingresado", "ingresada", "adentro", "ocupado", "ocupada", "ingreso", "en_curso", "dentro_garage", "checkin", "check_in"].includes(estadoExplicito)) {
    return "Dentro";
  }
  return "Pendiente";
};

export const extraerHora = (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim();

  if (/^\d{2}:\d{2}/.test(texto)) return texto.slice(0, 5);

  if (tieneZonaHoraria(texto)) {
    const fecha = new Date(texto);
    if (!Number.isNaN(fecha.getTime())) {
      return new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(fecha);
    }
  }

  if (texto.includes("T")) return texto.split("T")[1]?.slice(0, 5);
  if (texto.includes(" ")) return texto.split(" ")[1]?.slice(0, 5);
  if (texto.includes(":")) return texto.slice(0, 5);
  return null;
};

export const obtenerHoraEntradaReal = (reserva) => {
  const candidatos = [
    reserva.fecha_entrada_real,
    reserva.fechaEntradaReal,
    reserva.hora_entrada_real,
    reserva.horaEntradaReal,
    reserva.entrada_registrada,
    reserva.entradaRegistrada,
    reserva.check_in,
    reserva.checkIn,
    reserva.entrada,
    reserva.ingreso,
    reserva.fecha_ingreso,
    reserva.fechaIngreso,
    reserva.hora_ingreso,
    reserva.horaIngreso,
    reserva.ingreso_at,
    reserva.ingresoAt,
    reserva.check_in_at,
    reserva.checkInAt,
    reserva.movimiento?.fecha_entrada,
    reserva.movimiento?.fechaEntrada,
    reserva.movimiento?.hora_entrada,
    reserva.movimiento?.horaEntrada,
    reserva.movimiento?.fecha_ingreso,
    reserva.movimiento?.hora_ingreso,
  ];

  for (const candidato of candidatos) {
    if (typeof candidato === "boolean" || candidato === 0 || candidato === 1) continue;
    const hora = extraerHora(candidato);
    if (hora) return hora;
  }

  return null;
};

export const obtenerHoraSalidaReal = (reserva) => {
  const candidatos = [
    reserva.fecha_salida_real,
    reserva.fechaSalidaReal,
    reserva.hora_salida_real,
    reserva.horaSalidaReal,
    reserva.salida_registrada,
    reserva.salidaRegistrada,
    reserva.check_out,
    reserva.checkOut,
    reserva.salida,
    reserva.egreso,
    reserva.fecha_egreso,
    reserva.fechaEgreso,
    reserva.hora_egreso,
    reserva.horaEgreso,
    reserva.egreso_at,
    reserva.egresoAt,
    reserva.check_out_at,
    reserva.checkOutAt,
    reserva.movimiento?.fecha_salida,
    reserva.movimiento?.fechaSalida,
    reserva.movimiento?.hora_salida,
    reserva.movimiento?.horaSalida,
    reserva.movimiento?.fecha_egreso,
    reserva.movimiento?.hora_egreso,
  ];

  for (const candidato of candidatos) {
    if (typeof candidato === "boolean" || candidato === 0 || candidato === 1) continue;
    const hora = extraerHora(candidato);
    if (hora) return hora;
  }

  return null;
};

const obtenerFechaHoraReserva = (reserva) => {
  const fecha = reserva?.fechaReserva;
  const hora = reserva?.horaReserva;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const fechaHora = new Date(anio, mes - 1, dia, horas, minutos);

  return Number.isNaN(fechaHora.getTime()) ? null : fechaHora;
};

export const obtenerHoraHabilitacionIngreso = (reserva) => {
  const fechaHoraReserva = obtenerFechaHoraReserva(reserva);
  if (!fechaHoraReserva) return null;

  const fechaHabilitacion = new Date(fechaHoraReserva);
  fechaHabilitacion.setMinutes(fechaHabilitacion.getMinutes() - MINUTOS_ANTICIPACION_INGRESO);
  return fechaHabilitacion;
};

const formatearHora = (fecha) =>
  new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);

export const obtenerMensajeIngresoAnticipado = (reserva) => {
  const fechaHabilitacion = obtenerHoraHabilitacionIngreso(reserva);
  if (!fechaHabilitacion) return MENSAJE_INGRESO_ANTICIPADO;

  return `No se puede registrar el ingreso todavia. La entrada del vehiculo se podra efectuar a partir de las ${formatearHora(fechaHabilitacion)}, una hora antes del horario de la reserva.`;
};

const obtenerFechaHoraProgramada = (fecha, hora) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) || !/^\d{2}:\d{2}$/.test(String(hora))) {
    return null;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const fechaHora = new Date(anio, mes - 1, dia, horas, minutos);

  return Number.isNaN(fechaHora.getTime()) ? null : fechaHora;
};

const estaReservaPendienteVencida = (reserva, ahora = new Date()) => {
  if (reserva.estado !== "Pendiente") return false;
  const salidaProgramada = obtenerFechaHoraProgramada(reserva.fechaReserva, reserva.horaSalidaPrevista);
  return Boolean(salidaProgramada && salidaProgramada <= ahora);
};

export const obtenerClaseEstado = (estado) =>
  String(estado || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");

export const normalizarReservaControlAcceso = (r) => {
  const estadoBase = normalizarEstadoReserva(r);
  const fechaReserva = obtenerFechaReserva(r);
  const horaSalidaPrevista = extraerHora(r.hora_salida)
    ?? extraerHora(r.horaFin)
    ?? extraerHora(r.fecha_salida)
    ?? extraerHora(r.fecha_fin)
    ?? extraerHora(r.fechaFinalizacion)
    ?? "--:--";
  const estado = estaReservaPendienteVencida({
    estado: estadoBase,
    fechaReserva,
    horaSalidaPrevista,
  }) ? "Sin registro" : estadoBase;

  return {
    id: obtenerIdReserva(r),
    conductor: r.conductor || r.usuario_nombre || r.usuario?.nombre || "Conductor desconocido",
    fechaReserva,
    horaReserva: extraerHora(r.hora_entrada)
      ?? extraerHora(r.horaInicio)
      ?? extraerHora(r.fecha_entrada)
      ?? extraerHora(r.fecha_inicio)
      ?? "--:--",
    horaSalidaPrevista,
    vehiculo: [
      r.marca_nombre ?? r.vehiculo?.marca?.nombre ?? r.vehiculo?.marca,
      r.modelo_nombre ?? r.vehiculo?.modelo?.nombre ?? r.vehiculo?.modelo,
    ].filter(Boolean).join(" ") || "Vehículo desconocido",
    patenteInterna: r.patente || r.vehiculo?.patente || r.vehiculo?.placa || "--",
    estado,
    horaEntrada: obtenerHoraEntradaReal(r),
    horaSalida: obtenerHoraSalidaReal(r),
    raw: r,
  };
};
