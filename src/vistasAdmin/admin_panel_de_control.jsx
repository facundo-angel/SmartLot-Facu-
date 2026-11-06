import { useMemo, useRef, useState } from 'react';
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
import { crearScopeConflictos, filtrarConflictos, ordenarConflictos } from "../helpers/conflictos";
import useConflictos from "../hooks/useConflictos";
import useStaleIndicator from "../hooks/useStaleIndicator";
import { ConflictosCreate } from "../servicies/API_Conflicto";
import { useAuth } from '../contexts/useAuth';

const MAX_PALABRAS = 300;
const contarPalabras = (texto) => (texto || "").trim().split(/\s+/).filter(Boolean).length;

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

export default function AdminPanelControl() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [mostrarPapelera, setMostrarPapelera] = useState(false);
  const [modalSoporteOpen, setModalSoporteOpen] = useState(false);
  const [nuevoConflicto, setNuevoConflicto] = useState({ descripcion: "", prioridad: "Media" });
  const [enviandoConflicto, setEnviandoConflicto] = useState(false);
  const [mensajeSoporte, setMensajeSoporte] = useState(null);
  const [busquedaConflictos, setBusquedaConflictos] = useState("");
  const [toast, setToast] = useState(null);
  const [compactMode, setCompactMode] = useState(true);
  const toastKeyRef = useRef(0);

  const mostrarToast = (mensaje, onDeshacer) => {
    toastKeyRef.current += 1;
    setToast({ id: toastKeyRef.current, mensaje, onDeshacer });
  };

  const conflictScope = useMemo(() => crearScopeConflictos(usuario), [usuario]);

  const {
    conflictosTenant,
    papeleraTenant,
    usuariosPorId,
    garagesList,
    pendientes,
    loadingConflictos,
    errorConflictos,
    actualizandoId,
    cargandoPapelera,
    conflictosResolviendo,
    ultimaActualizacion,
    cargarPapelera,
    cambiarEstado,
    eliminar,
    restaurar,
    limpiarError,
  } = useConflictos(conflictScope, {
    usuario,
    onToast: mostrarToast,
    onRestaurado: () => setMostrarPapelera(false),
  });

  const { tiempoTranscurrido, isStale } = useStaleIndicator(ultimaActualizacion);

  const conflictosVisibles = useMemo(
    () => filtrarConflictos(ordenarConflictos(conflictosTenant), busquedaConflictos, usuariosPorId),
    [conflictosTenant, busquedaConflictos, usuariosPorId]
  );

  const papeleraVisible = useMemo(
    () => filtrarConflictos(papeleraTenant, busquedaConflictos, usuariosPorId),
    [papeleraTenant, busquedaConflictos, usuariosPorId]
  );

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
    limpiarError();
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
              onRestaurar={restaurar}
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
            onCambiarEstado={cambiarEstado}
            onEliminar={eliminar}
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
