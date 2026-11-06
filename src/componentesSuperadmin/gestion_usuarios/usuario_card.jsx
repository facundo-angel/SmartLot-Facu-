import { Archive, Building2, Car, LogIn, MapPin, ShieldCheck } from "lucide-react";
import { ROLE_CLASSES } from "./constantes";

export function UserCardSkeleton() {
  return (
    <article className="usuario-card usuario-card-skeleton" aria-label="Cargando usuario">
      <div className="usuario-card-top">
        <span className="skeleton-line skeleton-usuario-avatar" />
        <div className="usuario-info skeleton-usuario-info">
          <span className="skeleton-line skeleton-usuario-name" />
          <span className="skeleton-line skeleton-usuario-role" />
        </div>
      </div>

      <div className="usuario-card-body">
        <span className="skeleton-line skeleton-usuario-email" />
        <span className="skeleton-line skeleton-usuario-phone" />
        <div className="usuario-metas">
          <span className="skeleton-line skeleton-usuario-meta" />
          <span className="skeleton-line skeleton-usuario-meta short" />
        </div>
      </div>

      <div className="usuario-card-footer skeleton-usuario-footer">
        <span className="skeleton-line skeleton-usuario-status" />
        <div className="usuario-actions">
          <span className="skeleton-line skeleton-usuario-login" />
          <span className="skeleton-line skeleton-usuario-action" />
        </div>
      </div>
    </article>
  );
}

function UsuarioCard({ usuario, onLoginAs, onArchivar, onVerGarages }) {
  const u = usuario;

  return (
    <article className={`usuario-card usuario-card-id-${u.id}`}>
      <div className="usuario-card-top">
        <div className="usuario-avatar">
          {u.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="usuario-info">
          <h3>{u.nombre}</h3>
          <span className={`usuario-role-badge ${ROLE_CLASSES[u.id_rol]}`}>
            <ShieldCheck size={12} />
            {u.role}
          </span>
        </div>
      </div>

      <div className="usuario-card-body">
        <p className="usuario-email">{u.email}</p>
        {u.telefono && <p className="usuario-tel">{u.telefono}</p>}

        <div className="usuario-metas">
          {u.empresa && (
            <span className="usuario-meta">
              <Building2 size={13} />
              {u.empresa}
            </span>
          )}
          {u.sede && (
            <span className={`usuario-meta ${u.id_rol === 1 ? 'usuario-meta-admin' : ''}`}>
              <MapPin size={13} />
              {u.sede}
            </span>
          )}
          {u.garages.length > 0 && <div className="usuario-garages-summary">
            <span className={`usuario-meta ${u.id_rol === 3 ? 'usuario-meta-garage' : ''}`} title={u.garages[0]}>
              <Car size={13} />
              <span>{u.garages[0]}</span>
            </span>
            {u.id_rol === 5 && u.garages.length > 1 ? <button type="button" className="usuario-garages-more" onClick={() => onVerGarages(u)} aria-label={`Ver los ${u.garages.length} garages de ${u.nombre}`}>
              Ver más <strong>+{u.garages.length - 1}</strong>
            </button> : null}
          </div>}
          {u.id_rol === 1 && !u.sede && (
            <span className="usuario-meta usuario-meta-admin">
              <Building2 size={13} />
              Admin General
            </span>
          )}
        </div>
      </div>

      <div className="usuario-card-footer">
        <div className="usuario-status">
          <div className="status-dot active"></div>
          <span>Activo</span>
        </div>

        {u.id_rol !== 4 && (
          <div className="usuario-actions">
            <button
              className="usuario-login-as-btn"
              onClick={() => onLoginAs(u)}
              aria-label={`Ingresar como ${u.nombre}`}
            >
              <LogIn size={14} />
              <span>Loguearte como</span>
            </button>
            <button
              className="usuario-archive-btn"
              onClick={() => onArchivar(u.id, u.nombre)}
              aria-label={`Archivar a ${u.nombre}`}
            >
              <Archive size={16} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default UsuarioCard;
