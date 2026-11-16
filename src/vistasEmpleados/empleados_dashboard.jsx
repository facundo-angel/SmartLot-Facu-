import { normalizeReservaDateTime, toReservaInstant } from '../helpers/reservaDateTime';
import { createReservaRefresh, bindReservaPolling } from '../helpers/reservaRefresh';
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircleQuestion, CalendarPlus } from "lucide-react";
import "./empleados_dashboard.css";
import EmptyState from "../componentesCompartidos/EmptyState";
import HeaderEmpleado from "../componentesEmpleado/header_empleado";
import TarjetaReserva from "../componentesEmpleado/tarjeta_reserva";
import ModalEditarReserva from "../componentesEmpleado/modal_editar_reserva";
import { ReservasGetByUsuario, ReservasGetDisponibilidadPorHora } from "../servicies/API_Reserva";
import { VehiculosGetAll } from "../servicies/API_Vehiculo";
import { GaragesGetAll } from "../servicies/API_Garage";
import { UsuariosGetById } from "../servicies/API_Usuario";
import { ModelosGetAll } from "../servicies/API_Modelo";
import { MarcasGetAll } from "../servicies/API_Marca";
import { ConflictosCreate } from "../servicies/API_Conflicto";
import { useAuth } from "../contexts/useAuth";
import FooterEmpleado from "../componentesEmpleado/footer_empleado";
import FormularioDetallesVehiculo from "../componentesEmpleado/formulario_detalles_vehiculo";
import ModalQrReserva from "../componentesEmpleado/ModalQrReserva";
import { EmpleadoDashboardIntroSkeleton, EmpleadoReservasSkeleton } from "../componentesEmpleado/empleados_dashboard_skeleton";
import ModalReporteEmpleado from "../componentesEmpleado/modal_reporte_empleado";
import { obtenerTipoQrReserva, puedeMostrarQrReserva } from "../helpers/qrReserva";
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
  obtenerNombreUsuario,
  obtenerCampo,
  esReservaCancelada,
  normalizarReserva,
} from "../componentesEmpleado/empleado_dashboard_helpers";


const GARAGE_DASHBOARD_STORAGE_KEY = "smartlot_empleado_dashboard_garage";

const EmpleadoDisponibilidadSkeleton = () => (
  <section className="empleado-disponibilidad-card empleado-disponibilidad-skeleton" aria-label="Cargando disponibilidad">
    <div className="empleado-disponibilidad-top">
      <span className="empleado-skeleton-block empleado-skeleton-parking" />
      <span className="empleado-skeleton-block empleado-skeleton-live" />
    </div>
    <span className="empleado-skeleton-line empleado-skeleton-disponibilidad-label" />
    <div className="empleado-skeleton-availability-row">
      <span className="empleado-skeleton-line empleado-skeleton-big-number" />
      <span className="empleado-skeleton-line empleado-skeleton-capacity-label" />
    </div>
    <span className="empleado-skeleton-line empleado-skeleton-occupancy" />
    <div className="empleado-skeleton-metrics">
      <span className="empleado-skeleton-block empleado-skeleton-chip" />
      <span className="empleado-skeleton-block empleado-skeleton-chip empleado-skeleton-chip-short" />
    </div>
  </section>
);

function EmpleadoDashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [reservas, setReservas] = useState([]);
  const reservaRefreshRef = useRef(null);
  const [loadingReservas, setLoadingReservas] = useState(true);
  const [refreshError, setRefreshError] = useState("");
  const idUsuario = Number(obtenerIdUsuario(usuario));
  const [vehiculos, setVehiculos] = useState([]);
  const [garages, setGarages] = useState([]);
  const [garagesSede, setGaragesSede] = useState([]);
  const [garageUsuario, setGarageUsuario] = useState(null);
  const [garageSeleccionadoId, setGarageSeleccionadoId] = useState("");
  const [modelos, setModelos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deployableOpen, setDeployableOpen] = useState(false);
  const [reservaEditando, setReservaEditando] = useState(null);
  const [reservaNormEditando, setReservaNormEditando] = useState(null);
  const [horaSeleccionada, setHoraSeleccionada] = useState("");
  const [modalReporteOpen, setModalReporteOpen] = useState(false);
  const [descripcionReporte, setDescripcionReporte] = useState("");
  const [prioridadReporte, setPrioridadReporte] = useState("Media");
  const [enviandoReporte, setEnviandoReporte] = useState(false);
  const [mensajeReporte, setMensajeReporte] = useState(null);
  const [reservaQrId, setReservaQrId] = useState(null);
  const reporteSuccessTimeoutRef = useRef(null);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [disponibilidadHoras, setDisponibilidadHoras] = useState([]);
  const [cargandoDisponibilidad, setCargandoDisponibilidad] = useState(false);

  useEffect(() => {
    let montado = true;

    const cargarDatosEmpleado = async () => {
      setLoading(true);
      setError("");

      try {
        const idUsuario = Number(obtenerIdUsuario(usuario));
        const [vehiculosResponse, garagesResponse, usuarioResponse, modelosResponse, marcasResponse] = await Promise.all([
          VehiculosGetAll(),
          GaragesGetAll(),
          Number.isFinite(idUsuario) ? UsuariosGetById(idUsuario) : Promise.resolve({ respuesta: false, datos: null }),
          ModelosGetAll(),
          MarcasGetAll(),
        ]);

        if (!montado) return;

        const perfilUsuarioApi = usuarioResponse.respuesta ? obtenerObjeto(usuarioResponse.datos) : null;
        const perfilEmpleado = perfilUsuarioApi || usuario;

        if (perfilUsuarioApi) {
          setPerfilUsuario(perfilUsuarioApi);
        }

        const vehiculosApi = vehiculosResponse.respuesta ? obtenerListado(vehiculosResponse.datos) : [];
        const modelosLista = modelosResponse.respuesta ? obtenerListado(modelosResponse.datos) : [];
        const marcasLista = marcasResponse.respuesta ? obtenerListado(marcasResponse.datos) : [];
        const modelosPorIdMap = new Map(modelosLista.map((m) => [Number(m.id ?? m.id_modelo ?? m._id), m]));
        const marcasPorIdMap = new Map(marcasLista.map((m) => [Number(m.id ?? m.id_marca ?? m._id), m]));
        const vehiculosDelUsuario = vehiculosApi
          .filter((vehiculo) => Number(vehiculo.id_usuario ?? vehiculo.idUsuario ?? vehiculo.usuario_id) === idUsuario)
          .map((vehiculo) => {
            const idModelo = Number(vehiculo.id_modelo ?? vehiculo.idModelo ?? vehiculo.modelo_id);
            const modeloObj = modelosPorIdMap.get(idModelo);
            const modelo = modeloObj?.nombre || "";
            const marcaNombre = marcasPorIdMap.get(Number(modeloObj?.id_marca ?? modeloObj?.idMarca))?.nombre || "";
            return { ...vehiculo, marca_nombre: marcaNombre, modelo_nombre: modelo };
          });
        const garages = garagesResponse.respuesta ? obtenerListado(garagesResponse.datos) : [];
        const idSedeEmpleado = Number(obtenerIdSedeUsuario(perfilEmpleado));
        // GaragesGetAll ya aplica el alcance por tratos para la sede autenticada.
        const garagesDeSede = Number.isFinite(idSedeEmpleado)
          ? garages.filter(esGarageActivo)
          : [];
        const idGarageEmpleado = Number(obtenerIdGarageAsignado(perfilEmpleado));
        const garageGuardadoId = Number(localStorage.getItem(GARAGE_DASHBOARD_STORAGE_KEY));
        const garageEncontrado =
          garagesDeSede.find((garage) => Number(obtenerIdGarage(garage)) === garageGuardadoId) ??
          garagesDeSede.find((garage) => Number(obtenerIdGarage(garage)) === idGarageEmpleado) ??
          garagesDeSede[0] ??
          null;

        setVehiculos(vehiculosDelUsuario);
        setGarages(garages);
        setGaragesSede(garagesDeSede);
        setGarageUsuario(garageEncontrado);
        setGarageSeleccionadoId(garageEncontrado ? String(obtenerIdGarage(garageEncontrado)) : "");
        setModelos(modelosResponse.respuesta ? obtenerListado(modelosResponse.datos) : []);
        setMarcas(marcasResponse.respuesta ? obtenerListado(marcasResponse.datos) : []);

        if (!vehiculosResponse.respuesta) {
          setError("No se pudieron cargar todos tus datos.");
        } else if (!Number.isFinite(idSedeEmpleado)) {
          setError("No se pudo identificar tu sede.");
        } else if (garagesDeSede.length === 0) {
          setError("No hay garages disponibles para tu sede.");
        }
      } catch (err) {
        console.error("Error al cargar el dashboard de empleado:", err);
        if (montado) setError("Ocurrio un error al cargar tus reservas.");
      } finally {
        if (montado) setLoading(false);
      }
    };

    cargarDatosEmpleado();

    return () => {
      montado = false;
    };
  }, [usuario]);

  useEffect(() => {
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return undefined;
    }
    const refresh = createReservaRefresh({
      fetchReservations: (options) => {
        if (reservaRefreshRef.current === refresh && !options.signal.aborted) {
          // El skeleton sólo se muestra durante la primera carga, no el polling.
          return ReservasGetByUsuario(idUsuario, options);
        }
        return { respuesta: false };
      },
      onData: (rows, reason) => {
        setReservas(rows.filter((row) => !esReservaCancelada(row)));
        setRefreshError("");
        if (import.meta.env.DEV) {
          console.debug('[Reservas dashboard]', { reason, cantidad: rows.length,
            horariosIncompletos: rows.filter((row) => {
              const time = normalizeReservaDateTime(row);
              return !time.fecha || !time.hora_entrada || !time.hora_salida;
            }).length });
        }
      },
      onError: () => setRefreshError("No se pudieron actualizar tus reservas. Conservamos la información anterior."),
      onSettled: () => setLoadingReservas(false),
    });
    reservaRefreshRef.current = refresh;
    void refresh.refresh('initial');
    const cleanup = bindReservaPolling((reason) => refresh.refresh(reason), window, document);
    return () => {
      cleanup();
      refresh.dispose();
      if (reservaRefreshRef.current === refresh) reservaRefreshRef.current = null;
    };
  }, [idUsuario]);

  useEffect(() => {
    let montado = true;

    const cargarDisponibilidad = async () => {
      if (!garageSeleccionadoId) return;
      setCargandoDisponibilidad(true);

      try {
        const response = await ReservasGetDisponibilidadPorHora(garageSeleccionadoId, fechaSeleccionada);
        if (!montado) return;

        if (response.respuesta && response.datos?.horas) {
          const garage = garagesSede.find((g) => String(obtenerIdGarage(g)) === garageSeleccionadoId);
          const apertura = obtenerHoraApertura(garage);
          const cierre = obtenerHoraCierre(garage);
          let horas = response.datos.horas || [];
          if (apertura && cierre) {
            horas = horas.filter((h) => h.hora >= apertura && h.hora <= cierre);
          }
          setDisponibilidadHoras(horas);
          setHoraSeleccionada("");
        }
      } catch (err) {
        console.error("Error al cargar disponibilidad por hora:", err);
      } finally {
        if (montado) setCargandoDisponibilidad(false);
      }
    };

    cargarDisponibilidad();

    return () => { montado = false; };
  }, [garageSeleccionadoId, fechaSeleccionada]);

  useEffect(() => {
    return () => {
      if (reporteSuccessTimeoutRef.current) {
        clearTimeout(reporteSuccessTimeoutRef.current);
      }
    };
  }, []);

  const vehiculosPorId = useMemo(
    () => new Map(vehiculos.map((vehiculo) => [Number(obtenerIdVehiculo(vehiculo)), vehiculo])),
    [vehiculos]
  );

  const garagesPorId = useMemo(
    () => new Map(garages.map((garage) => [Number(obtenerIdGarage(garage)), garage])),
    [garages]
  );

  const modelosPorId = useMemo(
    () => new Map(modelos.map((m) => [Number(m.id ?? m.id_modelo ?? m._id), m])),
    [modelos]
  );

  const marcasPorId = useMemo(
    () => new Map(marcas.map((m) => [Number(m.id ?? m.id_marca ?? m._id), m])),
    [marcas]
  );

  const reservasRawPorId = useMemo(
    () => new Map(reservas.map((r) => [r.id ?? r.id_reserva, r])),
    [reservas]
  );

  const reservasNormalizadas = useMemo(() => {

    return reservas
      .map((reserva) => normalizarReserva(reserva, vehiculosPorId, garagesPorId, modelosPorId, marcasPorId))
      .filter((reserva) => {
        // Reservas con borrado logico: la API por usuario las incluye para el
        // historial y no deben mostrarse como activas.
        if (esReservaCancelada(reserva.raw)) return false;
        // Retenciones de pago que expiraron sin concretarse: nunca fueron
        // confirmadas y no deben figurar como reservas activas.
        if (String(reserva.estado).toLowerCase() === "expirada" && !reserva.entradaRegistrada) return false;
        if (reserva.salidaRegistrada) return false;
        const salidaProgramada = toReservaInstant(reserva.fechaSalidaCruda);
        if (!reserva.entradaRegistrada && salidaProgramada && salidaProgramada <= new Date()) return false;
        if (!reserva.fecha) return true;
        return true;
      })
      .sort((a, b) => `${a.fecha} ${a.horario}`.localeCompare(`${b.fecha} ${b.horario}`));
  }, [reservas, vehiculosPorId, garagesPorId, modelosPorId, marcasPorId]);

  const reservaPrincipal = reservasNormalizadas[0] || null;
  const restoReservas = reservasNormalizadas.slice(1);
  const reservaQrActiva = reservasNormalizadas.find((reserva) => Number(reserva.id) === Number(reservaQrId)) ?? null;
  const tieneResto = restoReservas.length > 0;
  const horaDataActual = useMemo(() => {
    if (!horaSeleccionada || disponibilidadHoras.length === 0) return null;
    return disponibilidadHoras.find((h) => h.hora === horaSeleccionada) || null;
  }, [horaSeleccionada, disponibilidadHoras]);

  const nombre = obtenerNombreUsuario(perfilUsuario || usuario);

  const abrirQrReserva = (reserva) => setReservaQrId(reserva.id);

  const handleGarageDashboardChange = (event) => {
    const nuevoId = event.target.value;
    const garageSeleccionado = garagesSede.find((garage) => String(obtenerIdGarage(garage)) === nuevoId) ?? null;

    setGarageSeleccionadoId(nuevoId);
    setGarageUsuario(garageSeleccionado);
    setHoraSeleccionada("");
    localStorage.setItem(GARAGE_DASHBOARD_STORAGE_KEY, nuevoId);
  };

  const handleHoraChange = (event) => {
    setHoraSeleccionada(event.target.value);
  };

  const handleFechaChange = (event) => {
    setFechaSeleccionada(event.target.value);
  };

  const handleReservaClick = (reservaNorm) => {
    const raw = reservasRawPorId.get(reservaNorm.id);
    if (raw) {
      setReservaEditando(raw);
      setReservaNormEditando(reservaNorm);
    }
  };

  const handleCopyReserva = (reservaNorm) => {
    const raw = reservasRawPorId.get(reservaNorm.id);
    if (!raw) return;

    const time = normalizeReservaDateTime(raw);
    const horaInicio = time.hora_entrada ?? '';
    const horaFin = time.hora_salida ?? '';
    const idGarage = Number(obtenerIdGarageAsignado(raw));
    const idVehiculo = Number(obtenerCampo(raw, ["id_vehiculo", "idVehiculo", "vehiculo_id", "vehiculoId"]));

    navigate("/nueva_reserva", {
      state: {
        copiaReserva: { horaInicio, horaFin, idGarage, idVehiculo },
      },
    });
  };

  const handleReservaActualizada = (reservaActualizada) => {
    reservaRefreshRef.current?.invalidate();
    setReservas((prev) =>
      prev.map((r) => {
        const id = r.id ?? r.id_reserva;
        return Number(id) === Number(reservaActualizada.id ?? reservaActualizada.id_reserva)
          ? reservaActualizada
          : r;
      })
    );
    setReservaEditando(null);
    setReservaNormEditando(null);
    void reservaRefreshRef.current?.refresh("edit");
  };

  const handleReservaEliminada = (idReserva) => {
    reservaRefreshRef.current?.invalidate();
    setReservas((prev) =>
      prev.filter((r) => {
        const id = r.id ?? r.id_reserva;
        return Number(id) !== Number(idReserva);
      })
    );
    setReservaEditando(null);
    setReservaNormEditando(null);
  };

  const abrirModalReporte = () => {
    if (reporteSuccessTimeoutRef.current) {
      clearTimeout(reporteSuccessTimeoutRef.current);
      reporteSuccessTimeoutRef.current = null;
    }
    setMensajeReporte(null);
    setModalReporteOpen(true);
  };

  const cerrarModalReporte = () => {
    if (enviandoReporte) return;
    if (reporteSuccessTimeoutRef.current) {
      clearTimeout(reporteSuccessTimeoutRef.current);
      reporteSuccessTimeoutRef.current = null;
    }
    setModalReporteOpen(false);
    setDescripcionReporte("");
    setPrioridadReporte("Media");
    setMensajeReporte(null);
  };

  const handleEnviarReporte = async (event) => {
    event.preventDefault();
    const descripcion = descripcionReporte.trim();
    const idUsuario = Number(obtenerIdUsuario(perfilUsuario || usuario));

    if (!descripcion) {
      setMensajeReporte({ tipo: "error", texto: "Describi brevemente el problema." });
      return;
    }

    if (contarPalabras(descripcion) > MAX_PALABRAS) {
      setMensajeReporte({ tipo: "error", texto: `La descripcion no puede tener mas de ${MAX_PALABRAS} palabras.` });
      return;
    }

    if (!Number.isFinite(idUsuario)) {
      setMensajeReporte({ tipo: "error", texto: "No se pudo identificar tu usuario." });
      return;
    }

    setEnviandoReporte(true);
    setMensajeReporte(null);

    const resultado = await ConflictosCreate({
      id_usuario: idUsuario,
      descripcion,
      prioridad: prioridadReporte,
    });

    if (resultado.respuesta) {
      setDescripcionReporte("");
      setPrioridadReporte("Media");
      setMensajeReporte({ tipo: "success", texto: "Mensaje enviado correctamente." });
      reporteSuccessTimeoutRef.current = setTimeout(() => {
        setModalReporteOpen(false);
        setMensajeReporte(null);
        reporteSuccessTimeoutRef.current = null;
      }, 1600);
    } else {
      setMensajeReporte({ tipo: "error", texto: resultado.datos?.message || "No se pudo enviar el reporte." });
    }

    setEnviandoReporte(false);
  };

  return (
    <div className="empleado-dashboard-page">
      <HeaderEmpleado />
      <main className="empleado-dashboard-main">
        {loading ? (
          <>
            <EmpleadoDashboardIntroSkeleton />
          </>
        ) : (
         
            <div className="empleado-dashboard-intro">
              <span className="empleado-dashboard-kicker">{new Date(fechaSeleccionada + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</span>
              <h1 className="empleado-dashboard-title">
                Hola{nombre ? ` ${nombre}` : ""}
              </h1>
            </div>
        )}

        <div className="empleado-reservas-header">
          <div>
            <span>Agenda</span>
            <h2>Mis Reservas Actuales</h2>
          </div>
          <button
            type="button"
            className="empleado-reportar-problema-link"
            onClick={abrirModalReporte}
          >
            <MessageCircleQuestion size={16} />
            Soporte
          </button>
        </div>

        {refreshError && <div className="empleado-dashboard-feedback" role="status">{refreshError}</div>}
        {error && (
          <div className="empleado-dashboard-feedback empleado-dashboard-feedback-error" role="alert">
            {error}
          </div>
        )}

        {loading || (loadingReservas && idUsuario > 0) ? (
          <EmpleadoReservasSkeleton />
        ) : reservasNormalizadas.length > 0 ? (
          <>
            <TarjetaReserva
              reserva={reservaPrincipal}
              onClick={handleReservaClick}
              onCopy={handleCopyReserva}
              onShowQr={abrirQrReserva}
              mostrarQr={puedeMostrarQrReserva(reservaPrincipal)}
              tipoQr={obtenerTipoQrReserva(reservaPrincipal)}
            />
            {tieneResto && (
              <button type="button" className={`empleado-reservas-toggle${deployableOpen ? " empleado-reservas-toggle--open" : ""}`} onClick={() => setDeployableOpen((prev) => !prev)}>
                <span>{deployableOpen ? "Ocultar" : `Mostrar todas (${restoReservas.length})`}</span>
                <span className="empleado-reservas-toggle-arrow" aria-hidden="true">&gt;</span>
              </button>
            )}
            <div className={`empleado-reservas-rest${deployableOpen ? " empleado-reservas-rest--open" : ""}`}>
              {restoReservas.map((reserva, index) => (
                <TarjetaReserva
                  key={`${reserva.id}-${index}`}
                  reserva={reserva}
                  onClick={handleReservaClick}
                  onCopy={handleCopyReserva}
                  onShowQr={abrirQrReserva}
                  mostrarQr={puedeMostrarQrReserva(reserva)}
                  tipoQr={obtenerTipoQrReserva(reserva)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={CalendarPlus}
            title="No tenes reservas activas."
            description="Reservá un lugar en un garage de tu sede y aparecerá acá para que puedas seguirlo."
            action={{ label: "Reservar ahora", to: "/nueva_reserva", icon: CalendarPlus }}
          />
        )}

        {reservasNormalizadas.length > 0 && (
          <button
            type="button"
            className="empleado-nueva-reserva-btn"
            onClick={() => navigate("/nueva_reserva")}
          >
            Nueva reserva
          </button>
        )}

       <FormularioDetallesVehiculo vehiculos={vehiculos} onVehiculoEliminado={(id) => setVehiculos((prev) => prev.filter((v) => (v.id ?? v.id_vehiculo ?? v._id) !== id))} />

      
      </main>
      <FooterEmpleado />

      {modalReporteOpen && (
        <ModalReporteEmpleado
          prioridad={prioridadReporte}
          descripcion={descripcionReporte}
          enviando={enviandoReporte}
          mensaje={mensajeReporte}
          maxPalabras={MAX_PALABRAS}
          contarPalabras={contarPalabras}
          onPrioridadChange={setPrioridadReporte}
          onDescripcionChange={setDescripcionReporte}
          onSubmit={handleEnviarReporte}
          onClose={cerrarModalReporte}
        />
      )}

      {reservaEditando && reservaNormEditando && (
        <ModalEditarReserva
          reservaRaw={reservaEditando}
          reservaNorm={reservaNormEditando}
          onClose={() => { setReservaEditando(null); setReservaNormEditando(null); }}
          onActualizada={handleReservaActualizada}
          onEliminada={handleReservaEliminada}
        />
      )}
      {reservaQrId !== null && reservaQrActiva ? (
        <ModalQrReserva
          idReserva={reservaQrId}
          tipo={obtenerTipoQrReserva(reservaQrActiva)}
          onClose={() => setReservaQrId(null)}
        />
      ) : null}
    </div>
  );
}

export default EmpleadoDashboard;
