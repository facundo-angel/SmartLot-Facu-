import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, MessageSquareWarning, Search, Trash2 } from "lucide-react";

import "./superadmin_conflictos.css";
import ToastUndo from "../componentesShared/ToastUndo";
import EmptyState from "../componentesCompartidos/EmptyState";
import TablaConflictos, { ConflictsTableSkeleton } from "../componentesCompartidos/TablaConflictos";
import { obtenerFechaConflicto, obtenerIdUsuario } from "../componentesCompartidos/utilConflictos";
import HeaderSuperadmin from "../componentesSuperadmin/header_superadmin";
import FooterSuperadmin from "../componentesSuperadmin/footer_superadmin";
import {
  ConflictosDelete,
  ConflictosGetAll,
  ConflictosGetPapelera,
  ConflictosRestore,
  ConflictosUpdate
} from "../servicies/API_Conflicto";
import { UsuariosGetAll } from "../servicies/API_Usuario";

const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  return [];
};

export default function SuperadminConflictos() {
  const navigate = useNavigate();
  const [conflictos, setConflictos] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cargandoPapelera, setCargandoPapelera] = useState(false);
  const [error, setError] = useState("");
  const [actualizandoId, setActualizandoId] = useState(null);
  const [mostrarPapelera, setMostrarPapelera] = useState(false);
  const [busquedaConflictos, setBusquedaConflictos] = useState("");
  const [toast, setToast] = useState(null);
  const toastKeyRef = useRef(0);
  const [compactMode, setCompactMode] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [conflictosResolviendo, setConflictosResolviendo] = useState(() => new Set());
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("");
  const [isStale, setIsStale] = useState(false);

  const mostrarToast = (mensaje, onDeshacer) => {
    toastKeyRef.current += 1;
    setToast({ id: toastKeyRef.current, mensaje, onDeshacer });
  };

  const cargarPapelera = async ({ force = false } = {}) => {
    setCargandoPapelera(true);
    const papeleraResponse = await ConflictosGetPapelera({ superAdmin: true, force });
    if (papeleraResponse.respuesta) {
      setPapelera(obtenerListado(papeleraResponse.datos));
    } else {
      setError("No se pudo cargar la papelera.");
    }
    setCargandoPapelera(false);
  };

  useEffect(() => {
    let montado = true;

    const cargarDatos = async () => {
      setLoading(true);
      setError("");

      try {
        const [conflictosResponse, papeleraResponse, usuariosResponse] = await Promise.all([
          ConflictosGetAll({ superAdmin: true }),
          ConflictosGetPapelera({ superAdmin: true }),
          UsuariosGetAll(),
        ]);

        if (!montado) return;

        if (conflictosResponse.respuesta) {
          setConflictos(obtenerListado(conflictosResponse.datos));
        } else {
          setError("No se pudieron cargar los conflictos enviados a superadmin.");
        }

        if (papeleraResponse.respuesta) {
          setPapelera(obtenerListado(papeleraResponse.datos));
        }

        if (usuariosResponse.respuesta) {
          setUsuarios(obtenerListado(usuariosResponse.datos));
        }
      } catch (err) {
        console.error("Error al cargar conflictos de superadmin:", err);
        if (montado) setError("Ocurrio un error al cargar los conflictos.");
      } finally {
        if (montado) {
          setLoading(false);
          setUltimaActualizacion(Date.now());
        }
      }
    };

    cargarDatos();
    return () => { montado = false; };
  }, []);

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

  const usuariosPorId = useMemo(
    () => new Map(usuarios.map((usuario) => [Number(usuario.id ?? usuario.id_usuario), usuario])),
    [usuarios]
  );

  const conflictosOrdenados = useMemo(() => {
    const pesoEstado = { Pendiente: 0, "En Proceso": 1, Resuelto: 2 };
    const pesoPrioridad = { Alta: 0, Media: 1, Baja: 2 };

    return [...conflictos].sort((a, b) => {
      const estadoDiff = (pesoEstado[a.estado] ?? 9) - (pesoEstado[b.estado] ?? 9);
      if (estadoDiff !== 0) return estadoDiff;

      const prioridadDiff = (pesoPrioridad[a.prioridad] ?? 9) - (pesoPrioridad[b.prioridad] ?? 9);
      if (prioridadDiff !== 0) return prioridadDiff;

      return new Date(obtenerFechaConflicto(b) || 0) - new Date(obtenerFechaConflicto(a) || 0);
    });
  }, [conflictos]);

  const filtrarConflictos = useMemo(() => {
    const query = busquedaConflictos.trim().toLowerCase();
    return (items) => {
      if (!query) return items;

      return items.filter((conflicto) => {
        const usuario = usuariosPorId.get(Number(obtenerIdUsuario(conflicto)));
        const nombreUsuario = usuario
          ? `${usuario.nombre || ""} ${usuario.apellido || ""} ${usuario.email || ""}`
          : "";
        return [
          nombreUsuario,
          conflicto.descripcion,
          conflicto.prioridad,
          conflicto.estado,
          obtenerIdUsuario(conflicto),
        ].some((valor) => String(valor || "").toLowerCase().includes(query));
      });
    };
  }, [busquedaConflictos, usuariosPorId]);

  const conflictosVisibles = useMemo(
    () => filtrarConflictos(conflictosOrdenados),
    [conflictosOrdenados, filtrarConflictos]
  );

  const papeleraVisible = useMemo(
    () => filtrarConflictos(papelera),
    [papelera, filtrarConflictos]
  );

  const pendientes = conflictos.filter((conflicto) => conflicto.estado !== "Resuelto").length;

  const handleCambiarEstado = async (conflicto, estado) => {
    const estadoAnterior = conflicto.estado;
    if (estadoAnterior === estado) return;
    setActualizandoId(conflicto.id);
    const payload = {
      id_usuario: obtenerIdUsuario(conflicto),
      descripcion: conflicto.descripcion,
      prioridad: conflicto.prioridad,
      estado,
      SuperAdmin: true,
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
      }
    }
    setActualizandoId(null);
  };

  const handleEliminar = async (id) => {
    setActualizandoId(id);
    const resultado = await ConflictosDelete(id);
    if (resultado.respuesta) {
      const idEliminado = id;
      setConflictos((prev) => prev.filter((item) => item.id !== idEliminado));
      await cargarPapelera({ force: true });
      mostrarToast("Conflicto eliminado", () => handleRestaurar(idEliminado));
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
    <div className="admin-panel superadmin-conflicts-page">
      <HeaderSuperadmin />
      <header className="admin-panel__header superadmin-conflicts-header">
        <button
          className="boton-back"
          onClick={() => navegarConTransicion("/superadmin_dashboard")}
          aria-label="Volver al dashboard"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="textoPanelControl">
          <h1 className="admin-panel__title">Conflictos de Superadmin</h1>
          <p className="admin-panel__subtitle">
            Casos enviados por administradores para seguimiento superior.
          </p>
        </div>
      </header>

      <section className="conflicts-section">
        <div className="conflicts-section__title-container">
          <MessageSquareWarning className="conflicts-section__alert-icon" />
          <div>
            <h2 className="conflicts-section__title">Conflictos recibidos ({pendientes})</h2>
            <p className="conflicts-section__subtitle">Reportes activos enviados por administradores.
              <span className={`last-updated ${isStale ? "last-updated--stale" : ""}`}>
                <span className="last-updated__dot" />
                {tiempoTranscurrido}
              </span>
            </p>
          </div>
        </div>

        {error && (
          <div className="conflicts-section__feedback conflicts-section__feedback--error" role="alert">
            {error}
          </div>
        )}

        <div className="conflicts-toolbar">
          <button
            type="button"
            className={`conflicts-toolbar__btn ${!mostrarPapelera ? "active" : ""}`}
            onClick={() => setMostrarPapelera(false)}
          >
            Activos ({conflictos.length})
          </button>
          <button
            type="button"
            className={`conflicts-toolbar__btn ${mostrarPapelera ? "active" : ""}`}
            onClick={handleMostrarPapelera}
          >
            <Trash2 size={15} />
            Papelera ({papelera.length})
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

        {loading ? (
          <ConflictsTableSkeleton encabezadoUsuario="Admin" />
        ) : mostrarPapelera ? (
          cargandoPapelera ? (
            <ConflictsTableSkeleton rows={3} encabezadoUsuario="Admin" />
          ) : papeleraVisible.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Trash2}
              title="No hay conflictos en la papelera."
              description="Los conflictos que elimines van a aparecer acá para que puedas restaurarlos."
              action={{ label: "Volver a conflictos", onClick: () => setMostrarPapelera(false), variant: "secondary" }}
            />
          ) : (
            <TablaConflictos
              conflictos={papeleraVisible}
              usuariosPorId={usuariosPorId}
              actualizandoId={actualizandoId}
              compactMode={compactMode}
              encabezadoUsuario="Admin"
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
              title="No hay conflictos enviados a superadmin."
              description="Cuando un admin escale un conflicto, va a aparecer acá."
            />
          )
        ) : (
          <TablaConflictos
            conflictos={conflictosVisibles}
            usuariosPorId={usuariosPorId}
            actualizandoId={actualizandoId}
            conflictosResolviendo={conflictosResolviendo}
            compactMode={compactMode}
            encabezadoUsuario="Admin"
            onCambiarEstado={handleCambiarEstado}
            onEliminar={handleEliminar}
          />
        )}
      </section>

      {toast && (
        <ToastUndo
          key={toast.id}
          message={toast.mensaje}
          onUndo={toast.onDeshacer}
          onClose={() => setToast(null)}
        />
      )}

      <FooterSuperadmin />
    </div>
  );
}
