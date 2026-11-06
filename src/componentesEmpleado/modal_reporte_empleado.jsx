import { X } from "lucide-react";

function ModalReporteEmpleado({
  prioridad,
  descripcion,
  enviando,
  mensaje,
  maxPalabras,
  contarPalabras,
  onPrioridadChange,
  onDescripcionChange,
  onSubmit,
  onClose,
}) {
  return (
    <div className="empleado-reporte-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="empleado-reporte-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="empleado-reporte-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="empleado-reporte-header">
          <div>
            <span>Soporte</span>
            <h2 id="empleado-reporte-title">Reportar problema</h2>
          </div>
          <button type="button" className="empleado-reporte-close" onClick={onClose} aria-label="Cerrar reporte">
            <X size={20} />
          </button>
        </div>

        <form className="empleado-reporte-form" onSubmit={onSubmit}>
          <label className="empleado-reporte-field">
            <span>Prioridad</span>
            <select value={prioridad} onChange={(event) => onPrioridadChange(event.target.value)}>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
            </select>
          </label>

          <label className="empleado-reporte-field">
            <span>Descripcion</span>
            <textarea
              value={descripcion}
              onChange={(event) => onDescripcionChange(event.target.value)}
              placeholder="Contanos que paso"
              rows={5}
              maxLength={3000}
            />
            <span className={`empleado-reporte-wordcount ${contarPalabras(descripcion) > maxPalabras ? "empleado-reporte-wordcount--exceeded" : ""}`}>
              {contarPalabras(descripcion)}/{maxPalabras} palabras
            </span>
          </label>

          {mensaje && (
            <div className={`empleado-reporte-feedback empleado-reporte-feedback--${mensaje.tipo}`} role="alert">
              {mensaje.texto}
            </div>
          )}

          <button type="submit" className="empleado-reporte-submit" disabled={enviando || mensaje?.tipo === "success"}>
            {enviando ? "Enviando..." : "Enviar reporte"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default ModalReporteEmpleado;
