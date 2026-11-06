import test from "node:test";
import assert from "node:assert/strict";

import {
  calcularHorasEntre,
  calcularHorasPico,
  contarReservasEnRango,
  obtenerRangoPeriodo,
  seSolapaConRango,
  sumarOcupacionPorHora,
} from "./reportes.js";

test("calcularHorasEntre usa la diferencia real entre fecha y hora", () => {
  assert.equal(calcularHorasEntre("2026-03-18T08:00:00", "2026-03-18T10:30:00"), 2.5);
});

test("calcularHorasEntre conserva el cruce de medianoche con horas sueltas", () => {
  assert.equal(calcularHorasEntre("23:00", "01:00"), 2);
});

test("calcularHorasEntre devuelve null para datos inválidos o duraciones no positivas", () => {
  assert.equal(calcularHorasEntre("", ""), null);
  assert.equal(calcularHorasEntre("sin-fecha", "01:00"), null);
  assert.equal(calcularHorasEntre("2026-03-18T10:00:00", "2026-03-18T10:00:00"), null);
});

test("sumarOcupacionPorHora acumula solo las horas ocupadas", () => {
  const acumulador = Array(24).fill(0);
  sumarOcupacionPorHora(acumulador, 10 * 60, 12 * 60);

  assert.equal(acumulador[10], 60);
  assert.equal(acumulador[11], 60);
  assert.equal(acumulador.reduce((total, minutos) => total + minutos, 0), 120);
});

test("sumarOcupacionPorHora reparte el cruce de medianoche entre ambos días", () => {
  const acumulador = Array(24).fill(0);
  sumarOcupacionPorHora(acumulador, 23 * 60, 1 * 60);

  assert.equal(acumulador[23], 60);
  assert.equal(acumulador[0], 60);
  assert.equal(acumulador.reduce((total, minutos) => total + minutos, 0), 120);
});

test("obtenerRangoPeriodo respeta las reglas de día, semana, mes y año", () => {
  const fecha = new Date(2026, 2, 18, 15, 30);

  const dia = obtenerRangoPeriodo(fecha, "dia");
  assert.equal(dia.inicio.getDate(), 18);
  assert.equal(dia.inicio.getHours(), 0);
  assert.equal(dia.fin.getDate(), 19);

  const semana = obtenerRangoPeriodo(fecha, "semana");
  assert.equal(semana.inicio.getDate(), 16);
  assert.equal(semana.fin.getDate(), 23);

  const mes = obtenerRangoPeriodo(fecha, "mes");
  assert.equal(mes.inicio.getMonth(), 2);
  assert.equal(mes.inicio.getDate(), 1);
  assert.equal(mes.fin.getMonth(), 3);
  assert.equal(mes.fin.getDate(), 1);

  const anio = obtenerRangoPeriodo(fecha, "año");
  assert.equal(anio.inicio.getFullYear(), 2026);
  assert.equal(anio.inicio.getMonth(), 0);
  assert.equal(anio.inicio.getDate(), 1);
  assert.equal(anio.fin.getFullYear(), 2027);
});

test("calcularHorasPico elige el bloque de dos horas con más ocupación", () => {
  const reservas = [
    { fecha_entrada: "2026-03-18T10:00:00", fecha_salida: "2026-03-18T12:00:00" },
  ];

  assert.equal(calcularHorasPico(reservas), "10:00 - 12:00");
  assert.equal(calcularHorasPico([]), "—");
});

test("seSolapaConRango respeta límites y reservas que cruzan medianoche", () => {
  const reserva = {
    fecha_entrada: "2026-03-18T10:00:00",
    fecha_salida: "2026-03-18T12:00:00",
  };

  assert.equal(
    seSolapaConRango(reserva, new Date("2026-03-18T11:00:00"), new Date("2026-03-18T13:00:00")),
    true
  );
  assert.equal(
    seSolapaConRango(reserva, new Date("2026-03-18T12:00:00"), new Date("2026-03-18T13:00:00")),
    false
  );

  const nocturna = {
    fecha_entrada: "2026-03-18T23:00:00",
    fecha_salida: "2026-03-18T01:00:00",
  };
  assert.equal(
    seSolapaConRango(nocturna, new Date("2026-03-18T23:30:00"), new Date("2026-03-18T23:45:00")),
    true
  );
  assert.equal(seSolapaConRango({}, new Date("2026-03-18T00:00:00"), new Date("2026-03-19T00:00:00")), false);
});

test("contarReservasEnRango cuenta las reservas que se solapan con el período", () => {
  const reservas = [
    { fecha_entrada: "2026-03-18T09:00:00", fecha_salida: "2026-03-18T10:00:00" },
    { fecha_entrada: "2026-03-18T11:00:00", fecha_salida: "2026-03-18T12:00:00" },
    { fecha_entrada: "2026-03-18T15:00:00", fecha_salida: "2026-03-18T16:00:00" },
  ];

  assert.equal(
    contarReservasEnRango(reservas, new Date("2026-03-18T10:30:00"), new Date("2026-03-18T12:30:00")),
    1
  );
  assert.equal(contarReservasEnRango(reservas, new Date("2026-03-18T00:00:00"), new Date("2026-03-19T00:00:00")), 3);
});
