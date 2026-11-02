import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Bell, CheckCircle2, Inbox, X, XCircle } from "lucide-react";
import { useNotificaciones } from "../hooks/useNotificaciones";
import { useAuth } from "../contexts/useAuth";
import { ROLE_NAMES, userHasRole } from "../helpers/roles";
import EmptyState from "./EmptyState";
import "./campana_notificaciones.css";

const tiempoRelativo = (valor) => {
  if (!valor) return "";
  const diff = Date.now() - new Date(valor).getTime();
  const minutos = Math.floor(diff / 60000);
  if (minutos < 1) return "Recién";
  if (minutos < 60) return `Hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "Ayer";
  if (dias < 7) return `Hace ${dias} días`;
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(new Date(valor));
};

const tipoNotificacion = (tipo) => {
  switch (tipo) {
    case "trato_cancelado":
    case "solicitud_cancelada":
    case "modificacion_rechazada":
      return { icono: XCircle, tono: "error" };
    case "trato_modificado":
    case "solicitud_modificacion":
      return { icono: Bell, tono: "amber" };
    case "solicitud_aceptada":
    case "modificacion_autorizada":
      return { icono: CheckCircle2, tono: "success" };
    case "solicitud_rechazada":
      return { icono: XCircle, tono: "error" };
    case "solicitud_enviada":
      return { icono: Inbox, tono: "amber" };
    default:
      return { icono: Bell, tono: "blue" };
  }
};

function CampanaNotificacionesInterna({
  rutaTratos,
  ctaTexto = "Ir a tratos",
  emptyDescription = "Cuando haya novedades sobre tus garages, aparecerán acá.",
  className = "",
}) {
  const navigate = useNavigate();
  const { notificaciones, noLeidas, loading, marcarLeida, marcarTodasLeidas, eliminar, eliminarLeidas } = useNotificaciones();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const irATratos = useCallback((notificacion) => {
    setIsOpen(false);
    if (notificacion && !notificacion.leida) marcarLeida(notificacion.id);
    navigate(rutaTratos);
  }, [navigate, rutaTratos, marcarLeida]);

  const totalBadge = noLeidas > 0 ? (noLeidas > 99 ? "99+" : noLeidas) : null;

  return (
    <div className={`cn-campana${className ? ` ${className}` : ""}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="cn-campana-boton"
        aria-label={noLeidas > 0 ? `Ver notificaciones, ${noLeidas} sin leer` : "Ver notificaciones"}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell size={26} />
        {!loading && totalBadge && (
          <span className="cn-campana-badge">{totalBadge}</span>
        )}
      </button>

      {isOpen && (
        <div className="cn-panel" role="dialog" aria-label="Centro de notificaciones">
          <header className="cn-panel-head">
            <div>
              <strong>Notificaciones</strong>
              <span>{noLeidas > 0 ? `${noLeidas} sin leer` : "Estás al día"}</span>
            </div>
            <div className="cn-panel-actions">
              {notificaciones.some((notificacion) => notificacion.leida) && (
                <button type="button" onClick={eliminarLeidas}>
                  Limpiar leídas
                </button>
              )}
              {noLeidas > 0 && (
                <button type="button" onClick={marcarTodasLeidas}>
                  Marcar todas leídas
                </button>
              )}
            </div>
          </header>

          <div className="cn-lista">
            {notificaciones.length === 0 ? (
              <EmptyState
                size="sm"
                icon={Bell}
                title="No tenés notificaciones por ahora"
                description={emptyDescription}
              />
            ) : (
              notificaciones.map((notificacion) => {
                const { icono: Icono, tono } = tipoNotificacion(notificacion.tipo);
                return (
                  <article
                    key={notificacion.id}
                    className={`cn-item${notificacion.leida ? " cn-item--leida" : ""}`}
                  >
                    <span className={`cn-item-icon cn-item-icon--${tono}`}>
                      <Icono size={17} />
                    </span>
                    <div className="cn-item-body">
                      <p>{notificacion.mensaje}</p>
                      <div className="cn-item-meta">
                        {!notificacion.leida && <span className="cn-item-dot" aria-hidden="true" />}
                        <small>{tiempoRelativo(notificacion.created_at)}</small>
                      </div>
                      <button type="button" className="cn-item-cta" onClick={() => irATratos(notificacion)}>
                        {ctaTexto}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="cn-item-eliminar"
                      aria-label="Eliminar notificación"
                      onClick={() => eliminar(notificacion.id)}
                    >
                      <X size={14} />
                    </button>
                  </article>
                );
              })
            )}
          </div>

         
        </div>
      )}
    </div>
  );
}

export default function CampanaNotificaciones(props) {
  const { usuario } = useAuth();
  if (userHasRole(usuario, ROLE_NAMES.GARAGISTA)) return null;
  return <CampanaNotificacionesInterna {...props} />;
}
