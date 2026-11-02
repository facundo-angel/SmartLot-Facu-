import { CircleCheck } from 'lucide-react';
import BotonGenerico from '../componentesAdmin/boton_generico';
import FieldValidation from './FieldValidation';
import UbicacionAutocomplete from './UbicacionAutocomplete';
import { buildConditions } from '../helpers/validation';

export default function FormularioSede({
  formData,
  setFormData,
  validationSchema,
  field,
  touched,
  empresaField,
  onCoordenadasChange,
  onGuardar,
  onCancelar,
  loading = false,
  error = '',
  classNames,
  cancelButtonStyle,
}) {
  const actualizarCampo = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section className={classNames.form}>
      {empresaField}

      <div className={classNames.inputGroup}>
        <label>Nombre de la sede</label>
        <input
          type="text"
          placeholder="Ej: Sede Central"
          {...field('nombre')}
          autoComplete="off"
          required
        />
        <FieldValidation
          conditions={buildConditions(validationSchema, 'nombre', formData)}
          isTouched={touched.nombre}
        />
      </div>

      <div className={classNames.inputGroup}>
        <label className="label-optional">Descripción</label>
        <textarea
          placeholder="Descripción de la sede (opcional)"
          value={formData.descripcion}
          onChange={(e) => actualizarCampo('descripcion', e.target.value)}
          rows={3}
          autoComplete="off"
        />
      </div>

      <div className={classNames.inputGroup}>
        <label>Ubicación</label>
        <UbicacionAutocomplete
          value={formData.ubicacion}
          onChange={(value) => actualizarCampo('ubicacion', value)}
          onPlaceSelect={onCoordenadasChange}
          placeholder="Ej: Av. Corrientes 1234, CABA"
          required
        />
      </div>

      {error && <p className={classNames.error}>{error}</p>}

      <div className={classNames.actions}>
        <BotonGenerico
          className={classNames.saveButton}
          onClick={onGuardar}
          disabled={loading}
        >
          <CircleCheck size={20} color="white" />
          <span>{loading ? 'Guardando...' : 'Guardar sede'}</span>
        </BotonGenerico>

        <BotonGenerico
          className={classNames.cancelButton}
          style={cancelButtonStyle}
          onClick={onCancelar}
        >
          <span>Cancelar</span>
        </BotonGenerico>
      </div>
    </section>
  );
}
