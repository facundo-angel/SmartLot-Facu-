const TIME_ZONE_AR = "America/Argentina/Buenos_Aires";

const tieneZonaHoraria = (valor) => /[zZ]$|[+-]\d{2}:?\d{2}$/.test(valor);

const obtenerCampo = (item, claves) => {
  for (const clave of claves) {
    const valor = item?.[clave];
    if (valor !== undefined && valor !== null && valor !== "") return valor;
  }
  return "";
};

const obtenerFechaHoraReserva = (reserva, clavesFechaCompleta, clavesHora) => {
  const fechaCompleta = obtenerCampo(reserva, clavesFechaCompleta);
  if (fechaCompleta) return fechaCompleta;

  const fecha = obtenerCampo(reserva, ["fecha", "fecha_reserva", "fechaReserva"]);
  if (!fecha) return "";

  const hora = obtenerCampo(reserva, clavesHora);
  if (hora) return `${String(fecha).split(/[T ]/)[0]}T${String(hora)}`;

  return fecha;
};

export const obtenerFechaEntradaReserva = (reserva) =>
  obtenerFechaHoraReserva(
    reserva,
    ["fecha_entrada", "fechaEntrada", "fecha_inicio", "fechaInicio"],
    ["hora_entrada", "horaEntrada", "hora_inicio", "horaInicio"]
  );

export const obtenerFechaSalidaReserva = (reserva) =>
  obtenerFechaHoraReserva(
    reserva,
    ["fecha_salida", "fechaSalida", "fecha_finalizacion", "fechaFinalizacion", "fecha_fin", "fechaFin"],
    ["hora_salida", "horaSalida", "hora_fin", "horaFin"]
  );

const formateadorHoraLocal = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  hourCycle: "h23",
  timeZone: TIME_ZONE_AR,
});

const formateadorFechaLocal = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE_AR,
});

const extraerMinutosLocales = (fechaHora) => {
  if (!fechaHora) return null;
  const valor = String(fechaHora);

  if (/^\d{1,2}:\d{2}/.test(valor)) {
    const [hora, minutos] = valor.split(":").map(Number);
    return hora * 60 + minutos;
  }

  if (tieneZonaHoraria(valor)) {
    const fecha = new Date(valor);
    if (!Number.isNaN(fecha.getTime())) {
      const [hora, minutos] = formateadorHoraLocal.format(fecha).split(":").map(Number);
      return hora * 60 + minutos;
    }
  }

  const match = valor.match(/[T ](\d{1,2}):(\d{2})/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

const parsearFechaHora = (fechaHora) => {
  if (!fechaHora) return null;
  const valor = String(fechaHora);
  if (/^\d{1,2}:\d{2}/.test(valor)) return null;
  const valorNormalizado = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? `${valor}T00:00:00`
    : valor.replace(" ", "T");
  const fecha = new Date(tieneZonaHoraria(valor) ? valor : valorNormalizado);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
};

const obtenerFechaLocalISO = (fechaHora) => {
  if (!fechaHora) return "";
  const valor = String(fechaHora);

  if (tieneZonaHoraria(valor)) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? "" : formateadorFechaLocal.format(fecha);
  }

  return valor.split(/[T ]/)[0] || "";
};

export const obtenerDiaSemanaLocal = (fechaHora) => {
  const fechaIso = obtenerFechaLocalISO(fechaHora);
  if (!fechaIso) return null;
  const fecha = new Date(`${fechaIso}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.getDay();
};

export const calcularHorasEntre = (entrada, salida) => {
  const fechaEntrada = parsearFechaHora(entrada);
  const fechaSalida = parsearFechaHora(salida);

  if (fechaEntrada && fechaSalida) {
    const diff = (fechaSalida - fechaEntrada) / (1000 * 60 * 60);
    return diff > 0 ? diff : null;
  }

  const minutosEntrada = extraerMinutosLocales(entrada);
  const minutosSalida = extraerMinutosLocales(salida);
  if (minutosEntrada === null || minutosSalida === null) return null;

  const duracion = minutosSalida > minutosEntrada
    ? minutosSalida - minutosEntrada
    : (24 * 60 - minutosEntrada) + minutosSalida;

  return duracion > 0 ? duracion / 60 : null;
};

export const sumarOcupacionPorHora = (acumulador, minutosEntrada, minutosSalida) => {
  let inicio = minutosEntrada;
  let fin = minutosSalida;
  if (fin <= inicio) fin += 24 * 60;

  for (let hora = 0; hora < 24; hora++) {
    const inicioHora = hora * 60;
    const finHora = inicioHora + 60;
    const solapamiento = Math.max(0, Math.min(fin, finHora) - Math.max(inicio, inicioHora));
    const solapamientoDiaSiguiente = Math.max(0, Math.min(fin, finHora + 24 * 60) - Math.max(inicio, inicioHora + 24 * 60));
    acumulador[hora] += solapamiento + solapamientoDiaSiguiente;
  }
};

const formatearRangoHoras = (horaInicio, duracionHoras = 2) => {
  const horaFin = (horaInicio + duracionHoras) % 24;
  return `${String(horaInicio).padStart(2, "0")}:00 - ${String(horaFin).padStart(2, "0")}:00`;
};

const obtenerIntervaloReserva = (reserva) => {
  const entrada = obtenerFechaEntradaReserva(reserva);
  const salida = obtenerFechaSalidaReserva(reserva);
  const inicio = parsearFechaHora(entrada);
  const fin = parsearFechaHora(salida);

  if (!inicio || !fin) return null;

  if (fin <= inicio) {
    const finAjustado = new Date(fin);
    finAjustado.setDate(finAjustado.getDate() + 1);
    return { inicio, fin: finAjustado };
  }

  return { inicio, fin };
};

export const seSolapaConRango = (reserva, inicioRango, finRango) => {
  const intervalo = obtenerIntervaloReserva(reserva);
  return Boolean(intervalo && intervalo.inicio < finRango && intervalo.fin > inicioRango);
};

export const contarReservasEnRango = (reservas, inicioRango, finRango) =>
  reservas.filter((reserva) => seSolapaConRango(reserva, inicioRango, finRango)).length;

export const obtenerRangoPeriodo = (fecha, granularidad) => {
  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);

  switch (granularidad) {
    case "dia": {
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 1);
      return { inicio, fin };
    }
    case "semana": {
      const diaSemana = inicio.getDay();
      inicio.setDate(inicio.getDate() - ((diaSemana + 6) % 7));
      const fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 7);
      return { inicio, fin };
    }
    case "mes": {
      inicio.setDate(1);
      const fin = new Date(inicio);
      fin.setMonth(inicio.getMonth() + 1);
      return { inicio, fin };
    }
    case "año": {
      inicio.setMonth(0, 1);
      const fin = new Date(inicio);
      fin.setFullYear(inicio.getFullYear() + 1);
      return { inicio, fin };
    }
    default:
      return { inicio, fin: new Date(inicio) };
  }
};

export const calcularHorasPico = (reservasPeriodo) => {
  const horaOcupada = Array(24).fill(0);

  reservasPeriodo.forEach((r) => {
    const entrada = obtenerFechaEntradaReserva(r);
    const salida = obtenerFechaSalidaReserva(r);
    const minutosEntrada = extraerMinutosLocales(entrada);
    const minutosSalida = extraerMinutosLocales(salida);
    if (minutosEntrada !== null && minutosSalida !== null && minutosEntrada !== minutosSalida) {
      sumarOcupacionPorHora(horaOcupada, minutosEntrada, minutosSalida);
    }
  });

  let mejorRango = "";
  let mejorSuma = 0;
  for (let h = 0; h < 24; h++) {
    const suma = horaOcupada[h] + horaOcupada[(h + 1) % 24];
    if (suma > mejorSuma) {
      mejorSuma = suma;
      mejorRango = formatearRangoHoras(h);
    }
  }

  return mejorRango || "—";
};

export const normalizarGranularidadLabel = (granularidad) => {
  if (granularidad === "dia") return "Dia";
  if (granularidad === "semana") return "Semana";
  if (granularidad === "mes") return "Mes";
  return "Año";
};
