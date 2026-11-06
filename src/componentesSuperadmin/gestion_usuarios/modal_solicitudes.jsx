import { Building2, Check, Inbox, Search, X } from "lucide-react";
import ModalPortal from "../../componentesCompartidos/ModalPortal";
import EmptyState from "../../componentesCompartidos/EmptyState";
import BotonGenerico from "../../componentesAdmin/boton_generico";
import { formatearFechaSolicitud } from "./helpers";

function ModalSolicitudes({
  totalSolicitudesPendientes,
  solicitudesFiltradas,
  searchTerm,
  onSearchChange,
  onClose,
  resolviendoSolicitud,
  onAprobar,
  onRechazar,
}) {
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="modal-solicitudes-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-solicitudes-header">
          <div className="modal-solicitudes-title-group">
            <Inbox size={24} />
            <div>
              <h2>Solicitudes de registro</h2>
              <p>Empresas pendientes de validación</p>
            </div>
          </div>
          <button
            className="modal-solicitudes-close"
            onClick={onClose}
            aria-label="Cerrar bandeja de solicitudes"
          >
            <X size={22} />
          </button>
        </div>

        <div className="modal-solicitudes-search">
          <div className="usuarios-search" style={{ width: "100%" }}>
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o empresa..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-solicitudes-body">
          {totalSolicitudesPendientes === 0 ? (
            <EmptyState
              size="sm"
              icon={Inbox}
              title="No hay solicitudes pendientes"
              description="Los registros de nuevas empresas aparecerán aquí."
            />
          ) : solicitudesFiltradas.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Search}
              tone="filtered"
              title={`No se encontraron solicitudes para "${searchTerm}"`}
              action={{ label: "Limpiar búsqueda", onClick: () => onSearchChange(""), variant: "secondary" }}
            />
          ) : (
            solicitudesFiltradas.map((s) => (
              <article key={s.id} className={`solicitud-registro-card solicitud-card-id-${s.id}`}>
                <div className="solicitud-registro-top">
                  <div className="solicitud-registro-info">
                    <div className="usuario-avatar">{(s.nombre || "?").charAt(0).toUpperCase()}</div>
                    <div>
                      <h3>{`${s.nombre || ""} ${s.apellido || ""}`.trim() || "Sin nombre"}</h3>
                      <p className="usuario-email">{s.email}</p>
                    </div>
                  </div>
                  <span className="badge-solicitud-pendiente">Pendiente</span>
                </div>

                <div className="solicitud-registro-empresa">
                  <Building2 size={15} />
                  <div>
                    <strong>{s.empresa_nombre}</strong>
                    {s.empresa_descripcion && <p>{s.empresa_descripcion}</p>}
                  </div>
                </div>

                <div className="solicitud-registro-meta">
                  {s.telefono && <span>{s.telefono}</span>}
                  <span>Recibida el {formatearFechaSolicitud(s.created_at)}</span>
                </div>

                <div className="solicitud-registro-actions">
                  <BotonGenerico
                    className="btn-aprobar-solicitud"
                    disabled={resolviendoSolicitud === s.id}
                    onClick={() => onAprobar(s)}
                  >
                    <Check size={16} />
                    <span>{resolviendoSolicitud === s.id ? "Procesando…" : "Aprobar"}</span>
                  </BotonGenerico>
                  <BotonGenerico
                    className="btn-rechazar-solicitud"
                    disabled={resolviendoSolicitud === s.id}
                    onClick={() => onRechazar(s)}
                  >
                    <X size={16} />
                    <span>Rechazar</span>
                  </BotonGenerico>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

export default ModalSolicitudes;
