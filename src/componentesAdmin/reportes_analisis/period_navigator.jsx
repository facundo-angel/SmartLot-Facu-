import { ChevronLeft, ChevronRight } from "lucide-react";

const GRANULARIDADES = ["dia", "semana", "mes", "año"];

const GRANULARIDAD_LABEL = {
  dia: "Día",
  semana: "Semana",
  mes: "Mes",
  año: "Año",
};

export default function PeriodNavigator({
  granularidad,
  onGranularidadChange,
  periodLabel,
  puedeAvanzar,
  onAtras,
  onAdelante,
}) {
  return (
    <div className="trend-controls">
      <div className="trend-granularidad">
        {GRANULARIDADES.map((g) => (
          <button
            key={g}
            className={`trend-granularidad-btn ${granularidad === g ? "active" : ""}`}
            onClick={() => onGranularidadChange(g)}
          >
            {GRANULARIDAD_LABEL[g]}
          </button>
        ))}
      </div>
      <div className="trend-nav">
        <button className="trend-nav-btn" onClick={onAtras} aria-label="Anterior">
          <ChevronLeft size={20} />
        </button>
        <span className="trend-nav-label">{periodLabel}</span>
        <button
          className="trend-nav-btn"
          onClick={onAdelante}
          disabled={!puedeAvanzar}
          aria-label="Siguiente"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
