import { CheckCircle2, Clock3, DoorOpen, QrCode, ShieldCheck } from "lucide-react";
import BadgeEstado from "./badge_estado";

function TarjetaAcceso({
  reserva,
  esAdmin,
  guardandoAccion,
  onEscanearIngreso,
  onEscanearSalida,
  abrirVerificacion,
  abrirVerificacionSalida,
}) {
  const estaDentro = reserva.estado === "Dentro";
  const IconoAccionSecundaria = estaDentro ? CheckCircle2 : ShieldCheck;

  return (
    <article className={`access-card${estaDentro ? " access-card--inside" : ""}`}>
      <div className="access-card__top">
        <div>
          <h3>{reserva.conductor}</h3>
          <p>{reserva.vehiculo}</p>
        </div>
        <BadgeEstado estado={reserva.estado} />
      </div>

      {estaDentro ? (
        <dl className={`access-card__meta ${reserva.horaEntrada ? "" : "access-card__meta--single"}`}>
          {reserva.horaEntrada ? (
            <div>
              <dt>Hora de entrada</dt>
              <dd>
                <DoorOpen size={15} />
                {reserva.horaEntrada}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Salida prevista</dt>
            <dd>
              <Clock3 size={15} />
              {reserva.horaSalidaPrevista}
            </dd>
          </div>
        </dl>
      ) : (
        <dl className="access-card__meta access-card__meta--single">
          <div>
            <dt>Hora de reserva</dt>
            <dd>
              <Clock3 size={15} />
              {reserva.horaReserva}
            </dd>
          </div>
        </dl>
      )}

      {!esAdmin ? (
        <div className="access-card__actions">
          <button
            className="garagista-primary-btn"
            type="button"
            onClick={estaDentro ? onEscanearSalida : onEscanearIngreso}
            disabled={guardandoAccion}
          >
            <QrCode size={17} />
            Escanear QR
          </button>
          <button
            className="garagista-secondary-btn"
            type="button"
            onClick={() => (estaDentro ? abrirVerificacionSalida(reserva) : abrirVerificacion(reserva))}
            disabled={guardandoAccion}
            aria-label={estaDentro
              ? `Registrar salida de ${reserva.conductor} con patente manual`
              : `Registrar ingreso de ${reserva.conductor} con patente manual`}
          >
            <IconoAccionSecundaria size={17} />
            Patente manual
          </button>
        </div>
      ) : null}
    </article>
  );
}

export default TarjetaAcceso;
