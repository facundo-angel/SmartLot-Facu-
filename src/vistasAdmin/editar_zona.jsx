import { useState, useEffect, useMemo, useRef } from "react";
import "./editar_zona.css";
import HeaderSuperadmin from "../componentesSuperadmin/header_superadmin";
import {
  ArrowLeft,
  Plus,
  MapPin,
  CheckCircle2,
  WifiOff,
  Save,
  X,
  PersonStanding,
  ShieldAlert,
  Trash2,
  Mail
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { Z_INDEX } from "../helpers/zIndex";
import { DIAS_SEMANA } from "../helpers/diasSemana";
import ToastUndo from "../componentesShared/ToastUndo";
import EmptyState from "../componentesCompartidos/EmptyState";
import BotonGenerico from "../componentesAdmin/boton_generico";
import FormularioZona from "../componentesAdmin/formulario_zona";
import FormularioCapacidad from "../componentesAdmin/formulario_capacidad";
import { GaragesUpdate } from "../servicies/API_Garage";
import { UsuariosGetByGarage, UsuariosPatchEstado } from '../servicies/API_Usuario';
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";
import FormularioPreciosGarage from "../componentesCompartidos/FormularioPreciosGarage";
import { buildGaragePricesPayload } from "../helpers/prices";

const parseEstadoBool = (estado) => {
  if (estado === 1 || estado === true || estado === "1" || estado === "activo" || estado === "Abierto" || estado === "abierto" || estado === "true") return true;
  return false;
};

const obtenerListadoUsuarios = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  return [];
};

const obtenerHoraGarage = (garage, claves) => {
  for (const clave of claves) {
    const valor = garage?.[clave];
    if (valor) return String(valor).slice(0, 5);
  }
  return "";
};

// Normaliza los días guardados al identificador que usa el selector operativo,
// aceptando arreglos o el formato Postgres "{Lunes,Miercoles}".
const normalizarDias = (dias) => {
  let diasArray = dias;
  if (typeof diasArray === 'string') {
    diasArray = diasArray.replace(/[{}]/g, '').split(',').filter(Boolean);
  }
  if (Array.isArray(diasArray) && diasArray.length > 0) {
    return diasArray.map(d => {
      const found = DIAS_SEMANA.find(dia => dia.api === d || dia.display === d);
      return found ? found.api : d;
    }).filter(Boolean);
  }
  return [];
};

const obtenerIdGarage = (garage) => garage?.id_garage ?? garage?.idGarage ?? garage?.id ?? garage?._id;

const construirFormulario = (garage) => ({
  nombre: garage?.nombre || '',
  piso: garage?.piso ?? '',
  ubicacion: garage?.ubicacion || '',
  hora_apertura: obtenerHoraGarage(garage, ['hora_apertura', 'horaApertura', 'apertura']),
  hora_cierre: obtenerHoraGarage(garage, ['hora_cierre', 'horaCierre', 'cierre']),
  capacidad_reservas: Number(garage?.capacidad_reservas || 0),
  capacidad_para_no_reservas: Number(garage?.capacidad_para_no_reservas || 0),
  dias: normalizarDias(garage?.dias),
  precio_pickup: garage?.precio_pickup ?? '',
  precio_auto: garage?.precio_auto ?? '',
  precio_moto: garage?.precio_moto ?? '',
});

const CAMPOS_COMPARABLES = [
  'nombre',
  'piso',
  'ubicacion',
  'hora_apertura',
  'hora_cierre',
  'capacidad_reservas',
  'capacidad_para_no_reservas',
  'precio_pickup',
  'precio_auto',
  'precio_moto',
];

function EditarZona() {
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoGarajistas, setCargandoGarajistas] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const garageData = location.state?.garage;

  const [toast, setToast] = useState(null);
  const toastKeyRef = useRef(0);

  const mostrarToast = (mensaje, onDeshacer) => {
    toastKeyRef.current += 1;
    setToast({ id: toastKeyRef.current, mensaje, onDeshacer });
  };

  const handleArchivarEmpleado = async (id) => {
    try {
      const response = await UsuariosPatchEstado(id, false);

      if (response.respuesta) {
        setUsuarios((prev) =>
          prev.map((user) =>
            (user.id ?? user.id_usuario) === id ? { ...user, activo: false } : user
          )
        );
        mostrarToast("Garajista archivado", async () => {
          const restore = await UsuariosPatchEstado(id, true);
          if (restore.respuesta) {
            setUsuarios((prev) =>
              prev.map((user) =>
                (user.id ?? user.id_usuario) === id ? { ...user, activo: true } : user
              )
            );
          }
        });
      } else {
        Swal.fire("Error", "No se pudo archivar al garajista.", "error");
      }
    } catch (err) {
      console.error("Error al archivar el garajista en el servidor:", err);
      Swal.fire("Error de red", "Hubo un error de red o de servidor. Por favor, inténtalo de nuevo.", "error");
    }
  };

  const formInicial = useMemo(() => construirFormulario(garageData), [garageData]);
  const estadoInicial = useMemo(() => parseEstadoBool(garageData?.estado), [garageData]);

  const [formData, setFormData] = useState(() => construirFormulario(garageData));
  const [estadoActivo, setEstadoActivo] = useState(estadoInicial);
  const [coordenadas, setCoordenadas] = useState(() => {
    if (garageData?.latitud || garageData?.longitud) {
      return { lat: garageData.latitud ?? null, lng: garageData.longitud ?? null, direccion: garageData.ubicacion || '' };
    }
    return { lat: null, lng: null, direccion: '' };
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const capacidadReservas = Number(formData.capacidad_reservas) || 0;
  const capacidadNoReservas = Number(formData.capacidad_para_no_reservas) || 0;
  const capacidad = capacidadReservas + capacidadNoReservas;

  const getSchema = () => ({
    nombre: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 3, message: 'Mínimo 3 caracteres' },
    ],
    piso: [
      { rule: (v) => v !== '' && v !== null && v !== undefined, message: 'Requerido' },
    ],
    ubicacion: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 5, message: 'Mínimo 5 caracteres' },
      () => ({ rule: () => coordenadas.lat !== null && coordenadas.lng !== null, message: 'Selecciona una ubicación válida del mapa' }),
    ],
    hora_apertura: [
      { rule: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')), message: 'Formato HH:MM requerido' },
    ],
    hora_cierre: [
      { rule: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')), message: 'Formato HH:MM requerido' },
      () => ({ rule: () => !formData.hora_apertura || !formData.hora_cierre || formData.hora_apertura < formData.hora_cierre, message: 'Apertura debe ser anterior a cierre' }),
    ],
    capacidad_reservas: [
      { rule: (v) => Number.isInteger(Number(v)) && Number(v) >= 0, message: 'Número entero ≥ 0' },
    ],
    capacidad_para_no_reservas: [
      { rule: (v) => Number.isInteger(Number(v)) && Number(v) >= 0, message: 'Número entero ≥ 0' },
    ],
    dias: [
      { rule: (v) => Array.isArray(v) && v.length > 0, message: 'Selecciona al menos un día' },
    ],
  });

  const { isValid, touched, touch, touchAll, handleChangeWithTouch } = useLiveValidation(formData, getSchema());

  const fieldsValidation = {};
  Object.keys(getSchema()).forEach((field) => {
    fieldsValidation[field] = {
      conditions: buildConditions(getSchema(), field, formData),
      isTouched: touched[field],
    };
  });

  // Los formularios compartidos pueden notificar un campo suelto o un objeto
  // completo (por ejemplo, capacidad), así que se soportan ambos formatos.
  const handleChange = (field, value) => {
    if (typeof field === "object" && field !== null) {
      const camposCambiados = Object.keys(field).filter((key) => field[key] !== formData[key]);
      setFormData((prev) => ({ ...prev, ...field }));
      camposCambiados.forEach(touch);
    } else {
      handleChangeWithTouch(field, value, setFormData);
    }
  };

  // --- LÓGICA DE DETECCIÓN DE CAMBIOS (DIRTY STATE) ---
  const isDirty = useMemo(() => {
    if (!garageData) return false;

    const cambioEnCampos = CAMPOS_COMPARABLES.some(
      (campo) => String(formData[campo] ?? '') !== String(formInicial[campo] ?? '')
    );

    return (
      cambioEnCampos ||
      estadoActivo !== estadoInicial ||
      [...formData.dias].sort().join(',') !== [...formInicial.dias].sort().join(',')
    );
  }, [formData, formInicial, estadoActivo, estadoInicial, garageData]);

  // Prevenir cierre accidental de pestaña o recarga del navegador
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Tienes cambios sin guardar en el garage. ¿Seguro que deseas salir?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
  // ----------------------------------------------------

  useEffect(() => {
    if (!garageData) {
      navigate("/superadmin/gestion_garages", { replace: true });
    }
  }, [garageData, navigate]);

  useEffect(() => {
    let estaMontado = true;

    const cargarGarajistasDelGarage = async () => {
      const garageId = obtenerIdGarage(garageData);
      if (!garageId) return;

      setCargandoGarajistas(true);
      const response = await UsuariosGetByGarage(garageId);

      if (!estaMontado) return;

      if (response.respuesta) {
        const listaLimpia = obtenerListadoUsuarios(response.datos);
        setUsuarios(listaLimpia);
      }
      setCargandoGarajistas(false);
    };

    cargarGarajistasDelGarage();

    return () => {
      estaMontado = false;
    };
  }, [garageData]);

  const garajistasAsignados = useMemo(() => {
    return usuarios.filter(
      (user) => Number(user.id_rol) === 3 && user.activo !== false
    );
  }, [usuarios]);

  // Interceptor Premium para salidas internas en la SPA
  const volverAGarages = async () => {
    if (isDirty) {
      const result = await Swal.fire({
        title: "Cambios sin guardar",
        text: "Has modificado la configuración del garage. Si sales ahora, perderás las modificaciones.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#EF4444", // Rojo destructivo elegante
        cancelButtonColor: "#64748B",
        confirmButtonText: "Salir sin guardar",
        cancelButtonText: "Permanecer aquí",
        reverseButtons: true,
        zIndex: Z_INDEX.SWAL_DIALOG,
      });

      if (!result.isConfirmed) return; // Se queda en la vista
    }
    navigate("/superadmin/gestion_garages");
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      touchAll();
      setError('❌ Corrige los errores antes de guardar.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nombre: formData.nombre.trim(),
        piso: String(formData.piso ?? '').trim(),
        ubicacion: formData.ubicacion.trim(),
        latitud: coordenadas.lat ?? null,
        longitud: coordenadas.lng ?? null,
        hora_apertura: formData.hora_apertura,
        hora_cierre: formData.hora_cierre,
        estado: estadoActivo,
        capacidad: Number(capacidad),
        capacidad_reservas: Number(capacidadReservas),
        capacidad_para_no_reservas: Number(capacidadNoReservas),
        dias: formData.dias,
        ...buildGaragePricesPayload(formData)
      };

      const id = obtenerIdGarage(garageData);

      const response = await GaragesUpdate(id, payload);

      if (response.respuesta) {
        Swal.fire({
          title: "¡Configuración Actualizada!",
          text: "Los cambios del garage han sido guardados correctamente.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          zIndex: Z_INDEX.SWAL_DIALOG,
        });
        navigate("/superadmin/gestion_garages", { replace: true });
      } else {
        const errorMsg = response.datos?.message || response.datos || 'Error desconocido al actualizar en la BD.';
        const limpio = typeof errorMsg === 'string' ? errorMsg.replace(/\b\d{2,}\b/g, "").replace(/\s+/g, " ").trim() : 'Error al actualizar el garage.';
        setError(`❌ Error al actualizar el garage: ${limpio}`);
      }
    } catch (err) {
      console.error('Error inesperado al guardar:', err);
      setError('❌ Ocurrió un error inesperado. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="editar-zona">
      <HeaderSuperadmin />

      <main className="contenido-editar-zona">
        <section className="editar-zona-top">
          <button
            className="boton-back-editar"
            onClick={volverAGarages}
            aria-label="Volver a gestión de garages"
          >
            <ArrowLeft size={20} />
          </button>

          <p>CONFIGURACIÓN</p>
          <h1>Edición de garage</h1>
          <span>
            Ajusta la información operativa, el estado y la capacidad del garage seleccionado.
          </span>
        </section>

        <form className="formulario-editar-zona" onSubmit={guardarCambios}>
          <FormularioPreciosGarage values={formData} onChange={handleChange} disabled={loading} />

          <FormularioZona
            formData={formData}
            onChange={handleChange}
            hideSede
            pisoNumerico={false}
            fieldsValidation={fieldsValidation}
            onCoordenadasChange={setCoordenadas}
            titulo="Información general"
            descripcion="Actualiza la identidad, ubicación y horario operativo del garage seleccionado."
          />

          <section className="bloque-formulario">
            <div className="bloque-titulo">
              <span className="bloque-icono">
                <MapPin size={20} />
              </span>
              <h3>Estado operativo</h3>
            </div>

            <div className="estado-container">
              <button
                type="button"
                className={`estado-btn estado-activo ${estadoActivo ? "activo" : ""}`}
                onClick={() => setEstadoActivo(true)}
              >
                <CheckCircle2 size={21} />
                <strong>Activo</strong>
                <span>Operando normal</span>
              </button>
              <button
                type="button"
                className={`estado-btn estado-desconectado ${!estadoActivo ? "activo" : ""}`}
                onClick={() => setEstadoActivo(false)}
              >
                <WifiOff size={21} />
                <strong>Inactivo</strong>
                <span>Sin conexión</span>
              </button>
            </div>
          </section>

          <FormularioCapacidad
            formData={formData}
            onChange={handleChange}
            fieldsValidation={fieldsValidation}
          />

          <section className="bloque-formulario">
            <div className="seccion-garajistas-zona">
              <div className="bloque-titulo" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="bloque-icono">
                    <PersonStanding size={20} />
                  </span>
                  <h3>Garajistas Asignados</h3>
                </div>
                <BotonGenerico
                  type="button"
                  className="btn-agregar-garajista-zona"
                  onClick={() => {
                    const garageId = obtenerIdGarage(garageData);
                    navigate("/agregar_garajista", {
                      state: {
                        id_garage: garageId,
                        garage: garageData
                      }
                    })
                  }}
                >
                  <Plus size={16} />
                  <span>Agregar Garajista</span>
                </BotonGenerico>
              </div>

              {cargandoGarajistas ? (
                <div className="gz-no-results">
                  <p>Buscando personal asignado en la base de datos...</p>
                </div>
              ) : garajistasAsignados.length > 0 ? (
                <div className="gz-garajistas-grid">
                  {garajistasAsignados.map((garajista) => {
                    const nombreCompleto = `${garajista.nombre || ''} ${garajista.apellido || ''}`.trim() || "Garajista sin nombre";
                    const garajistaId = garajista.id || garajista.id_usuario;
                    return (
                      <article key={garajistaId} className="gz-garajista-card">
                        <div className="gz-card-header">
                          <h3 className="gz-garajista-name">{nombreCompleto}</h3>
                          <span className="gz-role-badge">Garajista</span>
                        </div>

                        <div className="gz-parking-section">
                          <p className="gz-parking-label">CONTACTO OPERATIVO</p>
                          <div className="gz-parking-pill">
                            <div className="gz-icon-box"><Mail size={16}/></div>
                            <div className="gz-parking-details">
                              <span className="gz-spot-text">{garajista.email || 'Sin email'}</span>
                              <span className="gz-level-text">Tel: {garajista.telefono || 'Sin teléfono'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="gz-footer-row">
                          <BotonGenerico
                            className="gz-btn-eliminar"
                            onClick={() => handleArchivarEmpleado(garajistaId, nombreCompleto)}
                            aria-label={`Archivar garajista ${nombreCompleto}`}
                          >
                            <Trash2 size={16} className="gz-trash-icon" />
                          </BotonGenerico>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={ShieldAlert}
                  title="No hay ningún garajista asignado operando en este garage actualmente."
                  description="Asigná un garajista para que pueda gestionar el ingreso y la salida de vehículos."
                  action={{ label: "Gestionar personal", to: "/gestion_de_empleados", icon: PersonStanding }}
                />
              )}
            </div>
          </section>

          {error && <div className="error-message" style={{ color: '#d32f2f', padding: '12px', marginBottom: '16px', backgroundColor: '#ffebee', borderRadius: '4px', border: '1px solid #d32f2f' }}>{error}</div>}

          <div className="acciones-formulario">
            <BotonGenerico
              type="button"
              className="btn-cancelar"
              onClick={volverAGarages}
            >
              <X size={18} />
              <span>Cancelar</span>
            </BotonGenerico>

            <BotonGenerico type="submit" className="btn-guardar" disabled={loading}>
              <Save size={18} />
              <span>{loading ? "Guardando..." : "Guardar cambios"}</span>
            </BotonGenerico>
          </div>
        </form>
      </main>

      {toast && (
        <ToastUndo
          key={toast.id}
          message={toast.mensaje}
          onUndo={toast.onDeshacer}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default EditarZona;
