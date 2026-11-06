import { Clock3 } from "lucide-react";
import EmptyState from "../componentesCompartidos/EmptyState";
import BadgeEstado from "./badge_estado";

function GaragistaMovimientos({ movimientosFinalizados }) {
  return (
    <section className="garagista-section garagista-section--movements">
      <div className="garagista-section-heading">
        <div>
          <span>Actividad reciente</span>
          <h2>Últimos movimientos</h2>
        </div>
        <strong>{movimientosFinalizados.length}</strong>
      </div>

      <div className="movements-list">
        {movimientosFinalizados.length > 0 ? (
          movimientosFinalizados.map((reserva) => (
            <article className="movement-row" key={reserva.id}>
              <div>
                <h3>{reserva.conductor}</h3>
                <p>{reserva.vehiculo}</p>
              </div>
              <BadgeEstado estado={reserva.estado} />
              {reserva.horaEntrada ? <span>Entrada {reserva.horaEntrada}</span> : null}
              {reserva.horaSalida ? (
                <span>Salida real {reserva.horaSalida}</span>
              ) : reserva.estado === "Sin registro" ? (
                <span>Salida prevista {reserva.horaSalidaPrevista}</span>
              ) : null}
            </article>
          ))
        ) : (
          <EmptyState
            icon={Clock3}
            title="Todavía no hay movimientos finalizados."
            description="Los ingresos y salidas registrados van a aparecer en esta lista."
          />
        )}
      </div>
    </section>
  );
}

export default GaragistaMovimientos;
