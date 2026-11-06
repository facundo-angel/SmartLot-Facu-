import test from "node:test";
import assert from "node:assert/strict";

import {
  crearScopeConflictos,
  filtrarConflictos,
  obtenerListado,
  ordenarConflictos,
  perteneceAlTenant,
} from "./conflictos.js";

test("crearScopeConflictos prioriza sede, luego empresa y luego usuario", () => {
  assert.deepEqual(crearScopeConflictos({ id_sede: 7, id_empresa: 3, id_usuario: 9 }), {
    idSede: 7,
    idEmpresa: 3,
    idUsuario: 9,
    scopeKey: "sede:7",
  });

  assert.equal(
    crearScopeConflictos({ id_empresa: 3, id_usuario: 9 }).scopeKey,
    "empresa:3"
  );
  assert.equal(crearScopeConflictos({ id_usuario: 9 }).scopeKey, "usuario:9");
  assert.equal(crearScopeConflictos({}).scopeKey, "usuario:unknown");
});

test("obtenerListado reconoce los envoltorios usados por la API", () => {
  const lista = [{ id: 1 }];

  assert.equal(obtenerListado(lista), lista);
  assert.equal(obtenerListado({ datos: lista }), lista);
  assert.equal(obtenerListado({ data: lista }), lista);
  assert.equal(obtenerListado({ conflictos: lista }), lista);
  assert.equal(obtenerListado({ usuarios: lista }), lista);
  assert.deepEqual(obtenerListado({}), []);
});

test("perteneceAlTenant filtra por sede propia o por la sede del usuario reportante", () => {
  const scope = { idSede: 5 };
  const usuariosPorId = new Map([[10, { id_sede: 5 }]]);

  assert.equal(perteneceAlTenant({ id_sede: 5 }, usuariosPorId, scope), true);
  assert.equal(perteneceAlTenant({ id_usuario: 10 }, usuariosPorId, scope), true);
  assert.equal(perteneceAlTenant({ id_usuario: 11 }, usuariosPorId, scope), false);
  assert.equal(perteneceAlTenant({}, usuariosPorId, scope), false);
});

test("perteneceAlTenant filtra por empresa propia o por la empresa del usuario reportante", () => {
  const scope = { idEmpresa: 3 };
  const usuariosPorId = new Map([[10, { id_empresa: 3 }]]);

  assert.equal(perteneceAlTenant({ id_empresa: 3 }, usuariosPorId, scope), true);
  assert.equal(perteneceAlTenant({ id_usuario: 10 }, usuariosPorId, scope), true);
  assert.equal(perteneceAlTenant({ id_empresa: 4 }, usuariosPorId, scope), false);
});

test("perteneceAlTenant no muestra conflictos cuando el scope no tiene sede ni empresa", () => {
  assert.equal(perteneceAlTenant({ id_sede: 5 }, new Map(), {}), false);
});

test("ordenarConflictos ordena por estado, prioridad y fecha descendente", () => {
  const conflictos = [
    { id: 1, estado: "Resuelto", prioridad: "Alta", fecha_creacion: "2026-01-01T00:00:00Z" },
    { id: 2, estado: "Pendiente", prioridad: "Baja", fecha_creacion: "2026-01-01T00:00:00Z" },
    { id: 3, estado: "Pendiente", prioridad: "Alta", fecha_creacion: "2026-01-01T00:00:00Z" },
    { id: 4, estado: "Pendiente", prioridad: "Alta", fecha_creacion: "2026-01-02T00:00:00Z" },
    { id: 5, estado: "En Proceso", prioridad: "Media", fecha_creacion: "2026-01-01T00:00:00Z" },
  ];

  assert.deepEqual(
    ordenarConflictos(conflictos).map((conflicto) => conflicto.id),
    [4, 3, 2, 5, 1]
  );
});

test("filtrarConflictos busca por usuario, descripción, prioridad, estado e id", () => {
  const usuariosPorId = new Map([
    [1, { nombre: "Ana", apellido: "Perez", email: "ana@smartlot.com" }],
  ]);
  const conflictos = [
    { id: 1, id_usuario: 1, descripcion: "No abre la barrera", prioridad: "Alta", estado: "Pendiente" },
    { id: 2, id_usuario: 2, descripcion: "Error de pago", prioridad: "Baja", estado: "Resuelto" },
  ];

  assert.deepEqual(filtrarConflictos(conflictos, "", usuariosPorId), conflictos);
  assert.deepEqual(filtrarConflictos(conflictos, "ana", usuariosPorId).map((c) => c.id), [1]);
  assert.deepEqual(filtrarConflictos(conflictos, "barrera", usuariosPorId).map((c) => c.id), [1]);
  assert.deepEqual(filtrarConflictos(conflictos, "alta", usuariosPorId).map((c) => c.id), [1]);
  assert.deepEqual(filtrarConflictos(conflictos, "resuelto", usuariosPorId).map((c) => c.id), [2]);
  assert.deepEqual(filtrarConflictos(conflictos, "2", usuariosPorId).map((c) => c.id), [2]);
  assert.deepEqual(filtrarConflictos(conflictos, "inexistente", usuariosPorId), []);
});
