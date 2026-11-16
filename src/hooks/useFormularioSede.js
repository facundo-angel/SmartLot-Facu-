import { useEffect, useState } from "react";
import { SedesCreate } from "../servicies/API_Sede";
import useLiveValidation from "./useLiveValidation";

// Centraliza el estado y el alta de sedes. Cada vista aporta sus diferencias
// (schema, origen de la empresa, guard y destinos) para conservar el
// comportamiento específico de Admin y de Superadmin.
export default function useFormularioSede({
  validationSchema,
  initialFormData,
  cargarEmpresa,
  procesarEmpresa,
  dependenciasCargaEmpresa,
  validarAntesDeGuardar,
  obtenerIdEmpresa,
  alGuardar,
  alCancelar,
  alVolver,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [coordenadas, setCoordenadas] = useState({ lat: null, lng: null, direccion: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cargandoEmpresa, setCargandoEmpresa] = useState(true);

  const { isValid, touched, getFieldProps } = useLiveValidation(formData, validationSchema);
  const field = (name) => getFieldProps(name, setFormData);

  useEffect(() => {
    let mounted = true;

    const fetchEmpresa = async () => {
      setCargandoEmpresa(true);
      try {
        const datos = await cargarEmpresa();
        if (!mounted) return;
        if (datos !== null && datos !== undefined) procesarEmpresa(datos);
      } finally {
        if (mounted) setCargandoEmpresa(false);
      }
    };

    fetchEmpresa();
    return () => { mounted = false; };
  // El array lo define cada vista: Admin recarga al cambiar su empresa y
  // Superadmin carga una sola vez. Incluir las callbacks provocaría un refetch
  // en cada render, por eso se mantienen fuera de las dependencias.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependenciasCargaEmpresa);

  const handleGuardar = async () => {
    setError("");

    if (!isValid) return;

    const mensajeValidacion = validarAntesDeGuardar?.({ formData });
    if (mensajeValidacion) {
      setError(mensajeValidacion);
      return;
    }

    setLoading(true);

    const response = await SedesCreate({
      id_empresa: obtenerIdEmpresa({ formData }),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      ubicacion: formData.ubicacion.trim(),
      latitud: coordenadas.lat,
      longitud: coordenadas.lng,
    });

    if (response.respuesta) {
      alGuardar({ formData });
    } else {
      setLoading(false);
      setError(response.datos?.message || "Error al crear la sede.");
    }
  };

  return {
    formData,
    setFormData,
    field,
    touched,
    setCoordenadas,
    cargandoEmpresa,
    error,
    loading,
    onGuardar: handleGuardar,
    onCancelar: () => alCancelar({ formData }),
    onVolver: () => alVolver({ formData }),
  };
}
