import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConditions } from './validation.js';

test('resuelve reglas declarativas con su mensaje y resultado', () => {
  const schema = {
    nombre: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 2, message: 'Mínimo 2 caracteres' },
    ],
  };

  assert.deepEqual(buildConditions(schema, 'nombre', { nombre: 'A' }), [
    { label: 'Requerido', met: true },
    { label: 'Mínimo 2 caracteres', met: false },
  ]);
});

test('resuelve reglas definidas mediante funciones', () => {
  const schema = {
    horaFin: [
      () => ({ rule: () => true, message: 'Debe ser posterior a inicio' }),
    ],
  };

  assert.deepEqual(buildConditions(schema, 'horaFin', { horaFin: '10:00' }), [
    { label: 'Debe ser posterior a inicio', met: true },
  ]);
});

test('permite condiciones que dependen de otros campos', () => {
  const formData = { horaInicio: '09:00', horaFin: '08:00' };
  const schema = {
    horaFin: [
      () => ({
        rule: () => !formData.horaInicio || !formData.horaFin || formData.horaInicio < formData.horaFin,
        message: 'Debe ser posterior a inicio',
      }),
    ],
  };

  assert.deepEqual(buildConditions(schema, 'horaFin', formData), [
    { label: 'Debe ser posterior a inicio', met: false },
  ]);
});

test('devuelve una lista vacía para campos fuera del esquema', () => {
  assert.deepEqual(buildConditions({}, 'inexistente', {}), []);
  assert.deepEqual(buildConditions(undefined, 'nombre', {}), []);
});
