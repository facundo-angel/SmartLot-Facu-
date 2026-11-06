import { Archive, Building2, RotateCcw, Search, ShieldCheck, Trash2, X } from "lucide-react";
import ModalPortal from "../../componentesCompartidos/ModalPortal";
import EmptyState from "../../componentesCompartidos/EmptyState";
import BotonGenerico from "../../componentesAdmin/boton_generico";
import { ROLE_CLASSES } from "./constantes";

function ModalArchivados({
  totalArchivados,
  usuariosArchivados,
  searchTerm,
  onSearchChange,
  onClose,
  onRestaurar,
  onEliminar,
}) {
  return (
    <ModalPortal onClose={onClose}>
      <div
        className="modal-archivados-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-archivados-header">
          <div className="modal-archivados-title-group">
            <Archive size={24} />
            <h2>Usuarios Archivados</h2>
          </div>
          <button
            className="modal-archivados-close"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <div className="modal-archivados-search">
          <div className="usuarios-search" style={{ width: "100%" }}>
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Buscar archivados..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-archivados-body">
          {totalArchivados === 0 ? (
            <EmptyState
              size="sm"
              icon={Archive}
              title="No hay usuarios archivados"
              description="Los usuarios que archives aparecerán aquí."
            />
          ) : usuariosArchivados.length === 0 ? (
            <EmptyState
              size="sm"
              icon={Search}
              tone="filtered"
              title={`No se encontraron archivados para "${searchTerm}"`}
              action={{ label: "Limpiar búsqueda", onClick: () => onSearchChange(""), variant: "secondary" }}
            />
          ) : (
            usuariosArchivados.map((u) => (
              <article key={u.id} className="usuario-archivado-card">
                <div className="usuario-archivado-top">
                  <div className="usuario-archivado-info">
                    <div className="usuario-avatar">{u.nombre.charAt(0).toUpperCase()}</div>
                    <div>
                      <h3>{u.nombre}</h3>
                      <span className={`usuario-role-badge ${ROLE_CLASSES[u.id_rol]}`}>
                        <ShieldCheck size={12} />
                        {u.role}
                      </span>
                    </div>
                  </div>
                  <span className="badge-archivado">Archivado</span>
                </div>

                <p className="usuario-email">{u.email}</p>

                {u.empresa && (
                  <p className="usuario-meta">
                    <Building2 size={13} />
                    {u.empresa}
                  </p>
                )}

                <div className="usuario-archivado-actions">
                  {u.id_rol !== 4 && (
                    <>
                      <BotonGenerico
                        className="btn-restaurar"
                        onClick={() => onRestaurar(u.id, u.nombre)}
                      >
                        <RotateCcw size={16} />
                        <span>Restaurar</span>
                      </BotonGenerico>
                      <BotonGenerico
                        className="btn-eliminar-archivado"
                        onClick={() => onEliminar(u.id, u.nombre)}
                      >
                        <Trash2 size={16} />
                      </BotonGenerico>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

export default ModalArchivados;
