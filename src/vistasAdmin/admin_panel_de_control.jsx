import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  MessageCircleQuestion,
  MessageSquareWarning,
  Search,
  Trash2,
  X
} from 'lucide-react';
import "./admin_panel_de_control.css";
import Header from '../componentesAdmin/header_admin';
import FooterEmpleado from '../componentesAdmin/footer_admin';
import BotonReportes from "../componentesAdmin/boton_reportes";
import EmptyState from "../componentesCompartidos/EmptyState";
import TablaConflictos, { ConflictsTableSkeleton } from "../componentesCompartidos/TablaConflictos";
import { obtenerIdUsuario } from "../componentesCompartidos/utilConflictos";
import ToastUndo from "../componentesShared/ToastUndo";
import TablaReservasPanleControl from "../componentesAdmin/tabla_reservas_panelControl";
import {
  ConflictosCreate,
  ConflictosDelete,
  ConflictosGetAll,
  ConflictosGetPapelera,
  ConflictosRestore,
  ConflictosUpdate
} from "../servicies/API_Conflicto";
import { UsuariosGetAll } from "../servicies/API_Usuario";
import { GaragesGetAll } from "../servicies/API_Garage";
import { useAuth } from '../contexts/useAuth';

const MAX_PALABRAS = 300;
const contarPalabras = (texto) => (texto || "").trim().split(/\s+/).filter(Boolean).length;

const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.conflictos)) return datos.conflictos;
  if (Array.isArray(datos?.usuarios)) return datos.usuarios;
  return [];
};

const obtenerIdEmpresa = (item) => item?.id_empresa ?? item?.idEmpresa ?? item?.empresa_id ?? item?.empresaId;
const obtenerIdSede = (item) => item?.id_sede ?? item?.idSede ?? item?.sede_id ?? item?.sedeId;

const PanelStatsSkeleton = () => (
  <section className="panel-stats-card panel-stats--skeleton" aria-label="Cargando ocupacion total">
    <div className="panel-stats__header">
      <span className="panel-skeleton-line panel-skeleton-label" />
      <span className="panel-skeleton-icon" />
    </div>
    <span className="panel-skeleton-line panel-skeleton-value" />
    <span className="panel-skeleton-progress" />
  </section>
);

const getAdminConflictScope = (usuario) => {
  const idSede = obtenerIdSede(usuario);
  const idEmpresa = obtenerIdEmpresa(usuario);
  const idUsuario = obtenerIdUsuario(usuario);

  return {
    idSede,
    idEmpresa,
    idUsuario,
    scopeKey: idSede
      ? 'sede:' + idSede
      : idEmpresa
        ? 'empresa:' + idEmpresa
      : 'usuario:' + (idUsuario || 'unknown'),
  };
};

const perteneceAlTenantAdmin = (conflicto, usuariosPorId, scope) => {
  const conflictoEmpresa = obtenerIdEmpresa(conflicto);
  const conflictoSede = obtenerIdSede(conflicto);
  const usuarioConflicto = usuariosPorId.get(Number(obtenerIdUsuario(conflicto)));
  const usuarioEmpresa = obtenerIdEmpresa(usuarioConflicto);
  const usuarioSede = obtenerIdSede(usuarioConflicto);

  if (scope.idSede) {
    return Number(conflictoSede || usuarioSede) === Number(scope.idSede);
  }

  if (scope.idEmpresa) {
    return Number(conflictoEmpresa || usuarioEmpresa) === Number(scope.idEmpresa);
  }

  return false;
};

export default function AdminPanelControl() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [conflictos, setConflictos] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [garagesList, setGaragesList] = useState([]);
  const [loadingConflictos, setLoadingConflictos] = useState(true);
  const [errorConflictos, setErrorConflictos] = useState("");
  const [actualizandoId, setActualizandoId] = useState(null);
  const [mostrarPapelera, setMostrarPapelera] = useState(false);
  const [cargandoPapelera, setCargandoPapelera] = useState(false);
  const [modalSoporteOpen, setModalSoporteOpen] = useState(false);
  const [nuevoConflicto, setNuevoConflicto] = useState({ descripcion: "", prioridad: "Media" });
  const [enviandoConflicto, setEnviandoConflicto] = useState(false);
  const [mensajeSoporte, setMensajeSoporte] = useState(null);
  const [busquedaConflictos, setBusquedaConflictos] = useState("");
  const [toast, setToast] = useState(null);
  const [compactMode, setCompactMode] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [conflictosResolviendo, setConflictosResolviendo] = useState(() => new Set());
  const toastKeyRef = useRef(0);
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("");
  const [isStale, setIsStale] = useState(false);

  const mostrarToast = (mensaje, onDeshacer) => {
    toastKeyRef.current += 1;
    setToast({ id: toastKeyRef.current, mensaje, onDeshacer });
  };

  useEffect(() => {
    if (!ultimaActualizacion) return;
    const update = () => {
      const segs = Math.floor((Date.now() - ultimaActualizacion) / 1000);
      if (segs < 60) {
        setTiempoTranscurrido(`Actualizado hace ${segs}s`);
      } else {
        setTiempoTranscurrido(`Actualizado hace ${Math.floor(segs / 60)}m`);
      }
      setIsStale(segs > 300);
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [ultimaActualizacion]);

  const conflictScope = useMemo(() => getAdminConflictScope(usuario), [usuario]);

  const cargarPapelera = useCallback(async ({ force = false } = {}) => {
    setCargandoPapelera(true);
    const papeleraResponse = await ConflictosGetPapelera({ superAdmin: false, force, ...conflictScope });
    if (papeleraResponse.respuesta) {
      setPapelera(obtenerListado(papeleraResponse.datos));
    } else {
      setErrorConflictos("No se pudo cargar la papelera.");
    }
    setCargandoPapelera(false);
  }, [conflictScope]);

  useEffect(() => {
    let montado = true;

    const cargarDatos = async () => {
      setLoadingConflictos(true);
      setErrorConflictos("");

      try {
        const [conflictosResponse, papeleraResponse, usuariosResponse, garagesResponse] = await Promise.all([
          ConflictosGetAll({ superAdmin: false, ...conflictScope }),
          ConflictosGetPapelera({ superAdmin: false, ...conflictScope }),
          UsuariosGetAll(),
          GaragesGetAll(),
        ]);

        if (!montado) return;

        const adminIdSede = Number(usuario?.id_sede);
        const empresaAdmin = Number(usuario?.id_empresa);
        const tieneEmpresa = !isNaN(empresaAdmin) && empresaAdmin > 0;

        if (usuariosResponse.respuesta) {
          const usuariosList = obtenerListado(usuariosResponse.datos);

          let usuariosFiltrados = usuariosList;
          if (adminIdSede) {
            usuariosFiltrados = usuariosList.filter((u) => Number(u.id_sede ?? u.idSede) === adminIdSede);
          } else if (tieneEmpresa) {
            usuariosFiltrados = usuariosList.filter((u) => Number(u.id_empresa ?? u.idEmpresa) === empresaAdmin);
          }

          const userIdsSet = new Set(usuariosFiltrados.map((u) => Number(obtenerIdUsuario(u))));

          setUsuarios(usuariosFiltrados);

          if (conflictosResponse.respuesta) {
            const allConflictos = obtenerListado(conflictosResponse.datos);
            setConflictos(allConflictos.filter((c) => userIdsSet.has(Number(obtenerIdUsuario(c)))));
          } else {
            setErrorConflictos("No se pudieron cargar los conflictos.");
          }

          if (papeleraResponse.respuesta) {
            const allPapelera = obtenerListado(papeleraResponse.datos);
            setPapelera(allPapelera.filter((p) => userIdsSet.has(Number(obtenerIdUsuario(p)))));
          }
        } else {
          if (conflictosResponse.respuesta) {
            setConflictos(obtenerListado(conflictosResponse.datos));
          } else {
            setErrorConflictos("No se pudieron cargar los conflictos.");
          }

          if (papeleraResponse.respuesta) {
            setPapelera(obtenerListado(papeleraResponse.datos));
          }
        }

        const garArray = obtenerListado(garagesResponse.datos);

        // El listado de garages ya está aislado por los tratos del tenant en la API.
        setGaragesList(garArray);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        if (montado) setErrorConflictos("Ocurrio un error al cargar los datos.");
      } finally {
        if (montado) {
          setLoadingConflictos(false);
          setUltimaActualizacion(Date.now());
        }
      }
    };

    cargarDatos();

    return () => {
      montado = false;
    };
  }, [usuario, conflictScope]);

  const usuariosPorId = useMemo(
    () => new Map(usuarios.map((usuario) => [Number(usuario.id ?? usuario.id_usuario), usuario])),
    [usuarios]
  );

  const conflictosTenant = useMemo(
    () => conflictos.filter((conflicto) => perteneceAlTenantAdmin(conflicto, usuariosPorId, conflictScope)),
    [conflictos, usuariosPorId, conflictScope]
  );

  const papeleraTenant = useMemo(
    () => papelera.filter((conflicto) => perteneceAlTenantAdmin(conflicto, usuariosPorId, conflictScope)),
    [papelera, usuariosPorId, conflictScope]
  );

  const conflictosOrdenados = useMemo(() => {
    const pesoEstado = { Pendiente: 0, "En Proceso": 1, Resuelto: 2 };
    const pesoPrioridad = { Alta: 0, Media: 1, Baja: 2 };

    return [...conflictosTenant].sort((a, b) => {
      const estadoDiff = (pesoEstado[a.estado] ?? 9) - (pesoEstado[b.estado] ?? 9);
      if (estadoDiff !== 0) return estadoDiff;

      const prioridadDiff = (pesoPrioridad[a.prioridad] ?? 9) - (pesoPrioridad[b.prioridad] ?? 9);
      if (prioridadDiff !== 0) return prioridadDiff;

      return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
    });
  }, [conflictosTenant]);

  const filtrarConflictos = useCallback((items) => {
    const query = busquedaConflictos.trim().toLowerCase();
    if (!query) return items;

    return items.filter((conflicto) => {
      const usuarioConflicto = usuariosPorId.get(Number(obtenerIdUsuario(conflicto)));
      const nombreUsuario = usuarioConflicto
        ? `${usuarioConflicto.nombre || ""} ${usuarioConflicto.apellido || ""} ${usuarioConflicto.email || ""}`
        : "";
      return [
        nombreUsuario,
        conflicto.descripcion,
        conflicto.prioridad,
        conflicto.estado,
        obtenerIdUsuario(conflicto),
      ].some((valor) => String(valor || "").toLowerCase().includes(query));
    });
  }, [busquedaConflictos, usuariosPorId]);

  const conflictosVisibles = useMemo(
    () => filtrarConflictos(conflictosOrdenados),
    [conflictosOrdenados, filtrarConflictos]
  );

  const papeleraVisible = useMemo(
    () => filtrarConflictos(papeleraTenant),
    [papeleraTenant, filtrarConflictos]
  );

  const pendientes = conflictosTenant.filter((conflicto) => conflicto.estado !== "Resuelto").length;

  const ocupacion = useMemo(() => {
    let totalOcupados = 0;
    let totalCapacidad = 0;
    garagesList.forEach((g) => {
      const ocupados =
        Number(g.ocupacion_reservas || 0) + Number(g.ocupacion_no_reservas || 0);
      totalOcupados += ocupados;
      const cap =
        Number(g.capacidad_reservas || 0) + Number(g.capacidad_para_no_reservas || 0);
      totalCapacidad += cap;
    });
    const pct = totalCapacidad > 0 ? Math.round((totalOcupados / totalCapacidad) * 100) : 0;
    return { porcentaje: pct, ocupados: totalOcupados, capacidad: totalCapacidad };
  }, [garagesList]);

  const handleCambiarEstado = async (conflicto, estado) => {
    const estadoAnterior = conflicto.estado;
    if (estadoAnterior === estado) return;
    setActualizandoId(conflicto.id);
    const payload = {
      id_usuario: obtenerIdUsuario(conflicto),
      descripcion: conflicto.descripcion,
      prioridad: conflicto.prioridad,
      estado,
      SuperAdmin: conflicto.SuperAdmin === true,
    };

    const resultado = await ConflictosUpdate(conflicto.id, payload);
    if (resultado.respuesta) {
      if (estado === "Resuelto") {
        const resultadoEliminar = await ConflictosDelete(conflicto.id);
        if (resultadoEliminar.respuesta) {
          setConflictosResolviendo((prev) => new Set(prev).add(conflicto.id));
          await new Promise((resolve) => setTimeout(resolve, 520));
          setConflictos((prev) => prev.filter((item) => item.id !== conflicto.id));
          setConflictosResolviendo((prev) => {
            const next = new Set(prev);
            next.delete(conflicto.id);
            return next;
          });
          await cargarPapelera({ force: true });
          mostrarToast("Conflicto resuelto y enviado a papelera", async () => {
            const restaurado = await ConflictosRestore(conflicto.id);
            if (!restaurado.respuesta) return;

            const revert = await ConflictosUpdate(conflicto.id, { ...payload, estado: estadoAnterior });
            const conflictoRestaurado = revert.respuesta ? revert.datos : restaurado.datos;
            setPapelera((prev) => prev.filter((item) => item.id !== conflicto.id));
            setConflictos((prev) => [conflictoRestaurado, ...prev.filter((item) => item.id !== conflicto.id)]);
            await cargarPapelera({ force: true });
          });
        } else {
          setConflictos((prev) => prev.map((item) => item.id === conflicto.id ? resultado.datos : item));
        }
      } else {
        setConflictos((prev) => prev.map((item) => item.id === conflicto.id ? resultado.datos : item));
        mostrarToast(`Estado cambiado a "${estado}"`, async () => {
          const revert = await ConflictosUpdate(conflicto.id, { ...payload, estado: estadoAnterior });
          if (revert.respuesta) {
            setConflictos((prev) => prev.map((item) => item.id === conflicto.id ? revert.datos : item));
          }
        });
      }
    }
    setActualizandoId(null);
  };

  const handleCrearConflictoSuperadmin = async (event) => {
    event.preventDefault();
    const descripcion = nuevoConflicto.descripcion.trim();
    const idUsuario = Number(obtenerIdUsuario(usuario));

    if (!descripcion) {
      setMensajeSoporte({ tipo: "error", texto: "Describi brevemente el mensaje." });
      return;
    }

    if (contarPalabras(descripcion) > MAX_PALABRAS) {
      setMensajeSoporte({ tipo: "error", texto: `La descripcion no puede tener mas de ${MAX_PALABRAS} palabras.` });
      return;
    }

    if (!Number.isFinite(idUsuario)) {
      setMensajeSoporte({ tipo: "error", texto: "No se pudo identificar tu usuario." });
      return;
    }

    setEnviandoConflicto(true);
    setErrorConflictos("");
    setMensajeSoporte(null);
    const resultado = await ConflictosCreate({
      id_usuario: idUsuario,
      descripcion,
      prioridad: nuevoConflicto.prioridad,
      estado: "Pendiente",
      SuperAdmin: true,
    });

    if (resultado.respuesta) {
      setModalSoporteOpen(false);
      setNuevoConflicto({ descripcion: "", prioridad: "Media" });
      setMensajeSoporte(null);
    } else {
      setMensajeSoporte({ tipo: "error", texto: resultado.datos?.message || "No se pudo enviar el mensaje." });
    }
    setEnviandoConflicto(false);
  };

  const abrirModalSoporte = () => {
    setMensajeSoporte(null);
    setModalSoporteOpen(true);
  };

  const cerrarModalSoporte = () => {
    if (enviandoConflicto) return;
    setModalSoporteOpen(false);
    setNuevoConflicto({ descripcion: "", prioridad: "Media" });
    setMensajeSoporte(null);
  };

  const handleEliminar = async (id) => {
    setActualizandoId(id);
    const resultado = await ConflictosDelete(id);
    if (resultado.respuesta) {
      const conflictoEliminado = conflictos.find((c) => c.id === id);
      setConflictos((prev) => prev.filter((item) => item.id !== id));
      await cargarPapelera({ force: true });
      mostrarToast("Conflicto eliminado", () => {
        if (conflictoEliminado) handleRestaurar(id);
      });
    }
    setActualizandoId(null);
  };

  const handleRestaurar = async (id) => {
    setActualizandoId(id);
    const resultado = await ConflictosRestore(id);
    if (resultado.respuesta) {
      setPapelera((prev) => prev.filter((item) => item.id !== id));
      setConflictos((prev) => [resultado.datos, ...prev.filter((item) => item.id !== id)]);
      setMostrarPapelera(false);
      await cargarPapelera({ force: true });
    }
    setActualizandoId(null);
  };

  const handleMostrarPapelera = () => {
    setMostrarPapelera(true);
    cargarPapelera({ force: true });
  };

  const navegarConTransicion = (ruta) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => navigate(ruta, { replace: true }));
    } else {
      navigate(ruta, { replace: true });
    }
  };

  return (
    <div className="admin-panel">
      <Header />
      <header className="admin-panel__header">
        <button
          className="boton-back"
          onClick={() => navegarConTransicion("/admin_dashboard")}
          aria-label="Volver al dashboard"
        >
          <ArrowLeft size={24} />
        </button>

        <div className='textoPanelControl'>
          <h1 className="admin-panel__title">Panel de Control</h1>
          <p className="admin-panel__subtitle">
            Supervision general de reservas, ocupacion y conflictos reportados.
          </p>
        </div>
      </header>

      {loadingConflictos ? (
        <PanelStatsSkeleton />
      ) : (
        <section className="panel-stats-card">
          <div className="panel-stats__header">
            <span className="panel-stats__label">Ocupacion Total</span>
            <BarChart3 className="panel-stats__icon" />
          </div>
          <div className="panel-stats__value">
            {`${ocupacion.porcentaje}%`}
          </div>
          <div className="panel-stats__progress-container">
            <div className="panel-stats__progress-bar" style={{ width: `${ocupacion.porcentaje}%` }} />
          </div>
        </section>
      )}

      <section className="conflicts-section">
        <div className="conflicts-section__title-container">
          <MessageSquareWarning className="conflicts-section__alert-icon" />
          <div>
            <h2 className="conflicts-section__title">
              Conflictos reportados ({pendientes})
            </h2>
            <p className="conflicts-section__subtitle">Casos abiertos por empleados y estado de seguimiento.
              <span className={`last-updated ${isStale ? "last-updated--stale" : ""}`}>
                <span className="last-updated__dot" />
                {tiempoTranscurrido}
              </span>
            </p>
          </div>
          <button
            type="button"
            className="admin-support-btn"
            onClick={abrirModalSoporte}
          >
            <MessageCircleQuestion size={16} />
            Enviar mensaje a soporte
          </button>
        </div>

        {errorConflictos && (
          <div className="conflicts-section__feedback conflicts-section__feedback--error" role="alert">
            {errorConflictos}
          </div>
        )}

        <div className="conflicts-toolbar">
          <button
            type="button"
            className={`conflicts-toolbar__btn ${!mostrarPapelera ? "active" : ""}`}
            onClick={() => setMostrarPapelera(false)}
          >
            Activos ({conflictosTenant.length})
          </button>
          <button
            type="button"
            className={`conflicts-toolbar__btn ${mostrarPapelera ? "active" : ""}`}
            onClick={handleMostrarPapelera}
          >
            <Trash2 size={15} />
            Papelera ({papeleraTenant.length})
          </button>
          <label className="conflicts-search">
            <Search size={16} />
            <input
              type="search"
              value={busquedaConflictos}
              onChange={(event) => setBusquedaConflictos(event.target.value)}
              placeholder="Buscar conflictos"
              aria-label="Buscar conflictos"
            />
          </label>
          <button
            type="button"
            className={`conflicts-toolbar__btn conflicts-toolbar__btn--compact ${compactMode ? "active" : ""}`}
            onClick={() => setCompactMode((prev) => !prev)}
            aria-label={compactMode ? "Modo expandido" : "Modo compacto"}
            title={compactMode ? "Modo expandido" : "Modo compacto"}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="13" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <rect x="1" y="9" width="13" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {loadingConflictos ? (
          <ConflictsTableSkeleton />
        ) : mostrarPapelera ? (
          cargandoPapelera ? (
            <ConflictsTableSkeleton rows={3} />
          ) : papeleraVisible.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Trash2}
              title="No hay conflictos en tu papelera."
              description="Los conflictos que elimines van a aparecer acá para que puedas restaurarlos."
              action={{ label: "Volver a conflictos", onClick: () => setMostrarPapelera(false), variant: "secondary" }}
            />
          ) : (
            <TablaConflictos
              conflictos={papeleraVisible}
              usuariosPorId={usuariosPorId}
              actualizandoId={actualizandoId}
              compactMode={compactMode}
              encabezadoUsuario="Empleado"
              modoPapelera
              onRestaurar={handleRestaurar}
            />
          )
        ) : conflictosVisibles.length === 0 ? (
          busquedaConflictos ? (
            <EmptyState
              size="sm"
              icon={Search}
              tone="filtered"
              title="No se encontraron conflictos con esa búsqueda."
              action={{ label: "Limpiar búsqueda", onClick: () => setBusquedaConflictos(""), variant: "secondary" }}
            />
          ) : (
            <EmptyState
              size="sm"
              icon={CheckCircle2}
              tone="success"
              title="No hay conflictos reportados."
              description="Cuando un empleado reporte un conflicto, va a aparecer acá."
            />
          )
        ) : (
          <TablaConflictos
            conflictos={conflictosVisibles}
            usuariosPorId={usuariosPorId}
            actualizandoId={actualizandoId}
            conflictosResolviendo={conflictosResolviendo}
            compactMode={compactMode}
            encabezadoUsuario="Empleado"
            resaltarUrgentes
            onCambiarEstado={handleCambiarEstado}
            onEliminar={handleEliminar}
          />
        )}

        <div>
          <TablaReservasPanleControl />
        </div>
        <div>
          <BotonReportes />
        </div>
      </section>
      <FooterEmpleado />

      {toast && (
        <ToastUndo
          key={toast.id}
          message={toast.mensaje}
          onUndo={toast.onDeshacer}
          onClose={() => setToast(null)}
        />
      )}

      {modalSoporteOpen && (
        <div className="admin-support-overlay" role="presentation" onMouseDown={cerrarModalSoporte}>
          <section
            className="admin-support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-support-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="admin-support-header">
              <div>
                <span>Soporte</span>
                <h2 id="admin-support-title">Enviar mensaje a soporte</h2>
              </div>
              <button type="button" className="admin-support-close" onClick={cerrarModalSoporte} aria-label="Cerrar soporte">
                <X size={20} />
              </button>
            </div>

            <form className="admin-support-form" onSubmit={handleCrearConflictoSuperadmin}>
              <label className="admin-support-field">
                <span>Prioridad</span>
                <select
                  value={nuevoConflicto.prioridad}
                  onChange={(event) => setNuevoConflicto((prev) => ({ ...prev, prioridad: event.target.value }))}
                >
                  <option value="Baja">Baja</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </label>

              <label className="admin-support-field">
                <span>Descripcion</span>
                <textarea
                  value={nuevoConflicto.descripcion}
                  onChange={(event) => setNuevoConflicto((prev) => ({ ...prev, descripcion: event.target.value }))}
                  placeholder="Contanos que paso"
                  rows={5}
                  maxLength={3000}
                />
                <span className={`admin-support-wordcount ${contarPalabras(nuevoConflicto.descripcion) > MAX_PALABRAS ? "admin-support-wordcount--exceeded" : ""}`}>
                  {contarPalabras(nuevoConflicto.descripcion)}/{MAX_PALABRAS} palabras
                </span>
              </label>

              {mensajeSoporte && (
                <div className={`admin-support-feedback admin-support-feedback--${mensajeSoporte.tipo}`} role="alert">
                  {mensajeSoporte.texto}
                </div>
              )}

              <button type="submit" className="admin-support-submit" disabled={enviandoConflicto}>
                {enviandoConflicto ? "Enviando..." : "Enviar mensaje"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
