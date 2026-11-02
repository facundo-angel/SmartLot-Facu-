import { CheckCircle2, Clock3, RotateCcw, Trash2 } from "lucide-react";
import "./conflictos.css";
import {
  estadoClase,
  formatearFecha,
  obtenerFechaBorrado,
  obtenerFechaConflicto,
  obtenerIdUsuario,
  prioridadClase,
} from "./utilConflictos";

const obtenerNombreUsuario = (usuario, idUsuario) => {
  if (!usuario) return `Usuario #${idUsuario || "-"}`;
  const nombreCompleto = `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim();
  return nombreCompleto || usuario.email || `Usuario #${idUsuario || "-"}`;
};

export const ConflictsTableSkeleton = ({ rows = 4, encabezadoUsuario = "Empleado" }) => (
  <div className="conflicts-table-shell conflicts-table-shell--skeleton" aria-label="Cargando conflictos">
    <table className="conflicts-table">
      <thead>
        <tr>
          <th>{encabezadoUsuario}</th>
          <th>Descripcion</th>
          <th>Prioridad</th>
          <th>Estado</th>
          <th>Fecha</th>
          <th aria-label="Acciones" />
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, index) => (
          <tr key={index}>
            <td>
              <span className="panel-skeleton-line panel-skeleton-name" />
              <span className="panel-skeleton-line panel-skeleton-email" />
            </td>
            <td>
              <span className="panel-skeleton-line panel-skeleton-description" />
            </td>
            <td>
              <span className="panel-skeleton-pill" />
            </td>
            <td>
              <span className="panel-skeleton-select" />
            </td>
            <td>
              <span className="panel-skeleton-line panel-skeleton-date" />
            </td>
            <td>
              <span className="panel-skeleton-action" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function TablaConflictos({
  conflictos = [],
  usuariosPorId,
  actualizandoId = null,
  conflictosResolviendo,
  compactMode = false,
  encabezadoUsuario = "Empleado",
  resaltarUrgentes = false,
  modoPapelera = false,
  onCambiarEstado,
  onEliminar,
  onRestaurar,
}) {
  return (
    <div className={`conflicts-table-shell ${compactMode ? "conflicts-table-shell--compact" : ""}`}>
      <table className="conflicts-table">
        <thead>
          <tr>
            <th>{encabezadoUsuario}</th>
            <th>Descripcion</th>
            <th>Prioridad</th>
            <th>Estado</th>
            <th>{modoPapelera ? "Eliminado" : "Fecha"}</th>
            <th aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {conflictos.map((conflicto) => {
            const idUsuario = obtenerIdUsuario(conflicto);
            const usuarioConflicto = usuariosPorId?.get(Number(idUsuario));
            const nombreUsuario = obtenerNombreUsuario(usuarioConflicto, idUsuario);
            const deshabilitado = actualizandoId === conflicto.id;
            const resolviendo = conflictosResolviendo?.has(conflicto.id) ?? false;
            const esUrgente =
              resaltarUrgentes && conflicto.prioridad === "Alta" && conflicto.estado !== "Resuelto";
            const clasesFila = [
              esUrgente ? "conflict-row--urgent" : "",
              resolviendo ? "conflict-row--resolving" : "",
            ].filter(Boolean).join(" ");

            return (
              <tr key={conflicto.id} className={clasesFila || undefined}>
                <td>
                  <strong>{nombreUsuario}</strong>
                  {usuarioConflicto?.email && <span>{usuarioConflicto.email}</span>}
                </td>
                <td className="conflicts-table__description">{conflicto.descripcion}</td>
                <td>
                  <span className={`conflict-priority conflict-priority--${prioridadClase(conflicto.prioridad)}`}>
                    {conflicto.prioridad || "Baja"}
                  </span>
                </td>
                {modoPapelera ? (
                  <td>{conflicto.estado || "Pendiente"}</td>
                ) : (
                  <td>
                    <select
                      className={`conflict-status-select conflict-status-select--${estadoClase(conflicto.estado)}`}
                      value={conflicto.estado || "Pendiente"}
                      onChange={(event) => onCambiarEstado(conflicto, event.target.value)}
                      disabled={deshabilitado || resolviendo}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Proceso">En Proceso</option>
                      <option value="Resuelto">Resuelto</option>
                    </select>
                  </td>
                )}
                <td>
                  <span className="conflicts-table__date">
                    <Clock3 size={14} />
                    {formatearFecha(
                      modoPapelera ? obtenerFechaBorrado(conflicto) : obtenerFechaConflicto(conflicto)
                    )}
                  </span>
                </td>
                <td>
                  {modoPapelera ? (
                    <button
                      className="conflict-restore-btn"
                      onClick={() => onRestaurar(conflicto.id)}
                      disabled={deshabilitado}
                      aria-label="Restaurar conflicto"
                    >
                      <RotateCcw size={15} />
                    </button>
                  ) : (
                    <button
                      className="conflict-delete-btn"
                      onClick={() => onEliminar(conflicto.id)}
                      disabled={deshabilitado || resolviendo}
                      aria-label="Eliminar conflicto"
                    >
                      {conflicto.estado === "Resuelto" ? <CheckCircle2 size={15} /> : <Trash2 size={15} />}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
