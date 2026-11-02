import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useFooterCompacto } from "../hooks/useFooterCompacto";
import "./app_footer.css";

const obtenerIndiceGuardado = (storageKey, cantidad, fallback) => {
  const guardado = Number(sessionStorage.getItem(storageKey));
  return Number.isInteger(guardado) && guardado >= 0 && guardado < cantidad
    ? guardado
    : fallback;
};

/**
 * Footer común para todos los roles. La navegación, el almacenamiento del índice
 * activo y el comportamiento compacto viven acá; cada rol sólo aporta sus items,
 * su clase y su tema.
 */
function FooterNav({
  items,
  storageKey,
  ariaLabel,
  className = "",
  theme = "claro",
  badgePath = null,
  badgeCount = 0,
  badgeLoading = false,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const compacto = useFooterCompacto();

  const activeIndex = Math.max(
    items.findIndex((item) => item.path === pathname),
    0
  );
  const [visualIndex, setVisualIndex] = useState(() =>
    obtenerIndiceGuardado(storageKey, items.length, activeIndex)
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVisualIndex(activeIndex);
      sessionStorage.setItem(storageKey, String(activeIndex));
    });

    return () => cancelAnimationFrame(frame);
  }, [activeIndex, storageKey]);

  const mostrarBadge = (item) =>
    badgePath === item.path && !badgeLoading && badgeCount > 0;

  return (
    <footer
      className={`footer-nav footer-nav--${theme} ${className}${compacto ? " footer-compacto" : ""}`}
      style={{
        "--footer-active-offset": `${visualIndex * 100}%`,
        "--footer-items": items.length,
      }}
      aria-label={ariaLabel}
    >
      <span className="footer-nav__indicator" aria-hidden="true" />
      {items.map((item) => {
        const isActive = pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`footer-nav__item${isActive ? " footer-nav__item--active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
          >
            <span className="footer-nav__icon">
              {item.icon}
              {mostrarBadge(item) && (
                <span className="footer-nav__badge">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </span>
            <span className="footer-nav__label">{item.label}</span>
          </button>
        );
      })}
    </footer>
  );
}

export default FooterNav;
