import { CarFront, QrCode } from "lucide-react";
import EmptyState from "../componentesCompartidos/EmptyState";
import TarjetaAcceso from "./tarjeta_acceso";

function GaragistaPaneles({
  esAdmin,
  seccionMovil,
  onSeccionChange,
  reservasPendientes,
  autosDentro,
  guardandoAccion,
  terminoBusqueda,
  onEscanearIngreso,
  onEscanearSalida,
  abrirVerificacion,
  abrirVerificacionSalida,
  onLimpiarFiltro,
}) {
  return (
    <>
      <div className="garagista-mobile-tabs" role="group" aria-label="Estado de las reservas">
        <button
          type="button"
          className={seccionMovil === "pendientes" ? "is-active" : ""}
          onClick={() => onSeccionChange("pendientes")}
          aria-pressed={seccionMovil === "pendientes"}
        >
          Pendientes <span>{reservasPendientes.length}</span>
        </button>
        <button
          type="button"
          className={seccionMovil === "dentro" ? "is-active" : ""}
          onClick={() => onSeccionChange("dentro")}
          aria-pressed={seccionMovil === "dentro"}
        >
          Dentro <span>{autosDentro.length}</span>
        </button>
      </div>

      <div className="garagista-sections-grid">
        <section className={`garagista-section garagista-mobile-panel ${seccionMovil === "pendientes" ? "is-active" : ""}`}>
          <div className="garagista-section-heading">
            <div>
              <span>Ingresos pendientes</span>
              <h2>Reservas próximas</h2>
            </div>
            <strong>{reservasPendientes.length}</strong>
          </div>

          <div className="garagista-card-list">
            {reservasPendientes.length > 0 ? (
              reservasPendientes.map((reserva) => (
                <TarjetaAcceso
                  key={reserva.id}
                  reserva={reserva}
                  esAdmin={esAdmin}
                  guardandoAccion={guardandoAccion}
                  onEscanearIngreso={onEscanearIngreso}
                  onEscanearSalida={onEscanearSalida}
                  abrirVerificacion={abrirVerificacion}
                  abrirVerificacionSalida={abrirVerificacionSalida}
                />
              ))
            ) : (
              <EmptyState
                icon={QrCode}
                title="No hay reservas próximas para mostrar."
                description="Cuando haya reservas confirmadas, vas a poder registrar el ingreso desde acá."
              />
            )}
          </div>
        </section>

        <section className={`garagista-section garagista-mobile-panel ${seccionMovil === "dentro" ? "is-active" : ""}`}>
          <div className="garagista-section-heading">
            <div>
              <span>Ocupacion actual</span>
              <h2>Autos dentro</h2>
            </div>
            <strong>{autosDentro.length}</strong>
          </div>

          <div className="garagista-card-list">
            {autosDentro.length > 0 ? (
              autosDentro.map((reserva) => (
                <TarjetaAcceso
                  key={reserva.id}
                  reserva={reserva}
                  esAdmin={esAdmin}
                  guardandoAccion={guardandoAccion}
                  onEscanearIngreso={onEscanearIngreso}
                  onEscanearSalida={onEscanearSalida}
                  abrirVerificacion={abrirVerificacion}
                  abrirVerificacionSalida={abrirVerificacionSalida}
                />
              ))
            ) : (
              <EmptyState
                icon={CarFront}
                title={terminoBusqueda ? "No hay autos dentro con este filtro." : "No hay autos dentro ahora."}
                description={terminoBusqueda ? "Probá con otro término o quitá el filtro aplicado." : "Los vehículos que ingresen van a aparecer acá."}
                action={terminoBusqueda ? { label: "Limpiar filtro", variant: "secondary", onClick: onLimpiarFiltro } : (!esAdmin ? { label: "Escanear QR", icon: QrCode, onClick: onEscanearIngreso } : undefined)}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}

export default GaragistaPaneles;
