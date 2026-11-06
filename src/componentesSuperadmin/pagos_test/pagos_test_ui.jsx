import { estadoClase } from "./pagos_test_utils";

export function EstadoBadge({ estado }) {
  const texto = estado || "desconocido";
  return <span className={`mpt-badge mpt-badge--${estadoClase(texto)}`}>{texto}</span>;
}

export function EmptyTab({ icono, titulo, detalle, accion }) {
  return (
    <div className="mpt-empty">
      {icono}
      <strong>{titulo}</strong>
      <p>{detalle}</p>
      {accion ? (
        <button type="button" className="mpt-btn mpt-btn--primary" onClick={accion.onClick}>
          {accion.label}
        </button>
      ) : null}
    </div>
  );
}
