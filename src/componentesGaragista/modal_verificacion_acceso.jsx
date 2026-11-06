import { CarFront, X } from "lucide-react";
import ModalPortal from "../componentesCompartidos/ModalPortal";

function ModalVerificacionAcceso({
  reserva,
  tipoVerificacion,
  patenteIngresada,
  errorVerificacion,
  patenteVerificada,
  guardandoAccion,
  onClose,
  onSubmit,
  onPatenteChange,
  onConfirmar,
}) {
  return (
    <ModalPortal onClose={onClose} overlayClassName="garagista-modal-overlay">
      <form className="garagista-modal" onSubmit={onSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="garagista-modal__header">
          <div>
            <h2>{patenteVerificada ? "Confirmar vehículo" : `Verificar ${tipoVerificacion}`}</h2>
            <p>
              {patenteVerificada
                ? tipoVerificacion === "salida"
                  ? "Patente verificada"
                  : "Revisá los datos antes de registrar el ingreso."
                : `Ingresá la patente completa para validar ${tipoVerificacion === "salida" ? "la salida" : "el acceso"}.`}
            </p>
          </div>
          <button
            className="garagista-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {patenteVerificada ? (
          <div className="garagista-vehicle-confirmation" role="status">
            <span className="garagista-vehicle-confirmation__icon">
              <CarFront size={25} />
            </span>
            <div>
              <span>{tipoVerificacion === "salida" ? "Patente verificada" : "El vehículo que ingresará es"}</span>
              <strong>{reserva.vehiculo}</strong>
              {tipoVerificacion === "ingreso" ? <small>Patente {reserva.patenteInterna}</small> : null}
            </div>
          </div>
        ) : (
          <>
            {tipoVerificacion === "salida" ? (
              <div className="garagista-vehicle-confirmation">
                <span className="garagista-vehicle-confirmation__icon">
                  <CarFront size={25} />
                </span>
                <div>
                  <span>Vehículo dentro</span>
                  <strong>{reserva.vehiculo}</strong>
                  <small>{reserva.conductor}</small>
                </div>
              </div>
            ) : null}
            <label className="garagista-modal__field">
              <span>Patente</span>
              <input
                autoFocus
                type="text"
                placeholder="Ej: AB123CD"
                value={patenteIngresada}
                autoComplete="off"
                spellCheck="false"
                onChange={(event) => onPatenteChange(event.target.value)}
              />
            </label>
          </>
        )}

        {errorVerificacion ? (
          <p className="garagista-modal__error" role="alert">
            {errorVerificacion}
          </p>
        ) : null}

        <div className="garagista-modal__actions">
          <button className="garagista-cancel-btn" type="button" onClick={onClose} disabled={guardandoAccion}>
            Cancelar
          </button>
          <button
            className="garagista-primary-btn"
            type={patenteVerificada ? "button" : "submit"}
            onClick={patenteVerificada ? onConfirmar : undefined}
            disabled={guardandoAccion}
          >
            {guardandoAccion
              ? "Guardando..."
              : patenteVerificada
                ? tipoVerificacion === "salida" ? "Confirmar salida" : "Confirmar"
                : "Verificar patente"}
          </button>
        </div>
      </form>
    </ModalPortal>
  );
}

export default ModalVerificacionAcceso;
