import { ArrowLeft, CalendarDays, CarFront, Eye, Search, ShieldCheck } from "lucide-react";
import { obtenerIdGarage } from "./control_acceso_helpers";
import { SkeletonLine } from "./garagista_dashboard_skeleton";

function GaragistaEncabezado({
  esAdmin,
  onVolverAdmin,
  garageSeleccionadoId,
  onGarageChange,
  cargandoGaragesAdmin,
  garagesDisponibles,
  cargandoVista,
  garageData,
  fechaActual,
  cantidadAutosDentro,
  capacidadTotal,
  busqueda,
  onBusquedaChange,
}) {
  return (
    <>
      <header className="garagista-hero">
        <div className="garagista-title-block">
          {esAdmin ? (
            <button
              className="garagista-icon-button"
              type="button"
              onClick={onVolverAdmin}
              aria-label="Volver al dashboard de admin"
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}

          <div>
            <span className="garagista-eyebrow">
              {esAdmin ? <Eye size={16} /> : <ShieldCheck size={16} />}
              {esAdmin ? "Vista de solo lectura" : "Operación diaria"}
            </span>
            <h1>Control de acceso</h1>
          </div>
        </div>
      </header>

      <section className="garagista-summary-card" aria-label="Resumen operativo">
        <div>
          <span className="garagista-summary-label">
            {esAdmin ? "Garage consultado" : "Garage asignado"}
          </span>
          {esAdmin ? (
            <select
              className="garagista-garage-select"
              value={garageSeleccionadoId ?? ""}
              onChange={(event) => onGarageChange(Number(event.target.value) || null)}
              disabled={cargandoGaragesAdmin || garagesDisponibles.length === 0}
              aria-label="Seleccionar garage para consultar"
            >
              {garagesDisponibles.length === 0 ? (
                <option value="">Sin garages disponibles</option>
              ) : garagesDisponibles.map((garage) => (
                <option key={obtenerIdGarage(garage)} value={obtenerIdGarage(garage)}>
                  {garage.nombre || garage.name || garage.descripcion || garage.ubicacion || "Garage"}
                </option>
              ))}
            </select>
          ) : cargandoVista ? (
            <SkeletonLine className="garagista-skeleton-line--garage" />
          ) : (
            <strong>{garageData?.nombre || garageData?.name || garageData?.descripcion || garageData?.ubicacion || garageData?.nombre_garage || garageData?.garage_nombre || "Sin garage"}</strong>
          )}
        </div>

        <div className="garagista-summary-metric">
          <CalendarDays size={19} />
          <span>{fechaActual}</span>
        </div>

        <div className="garagista-capacity">
          <CarFront size={22} />
          {cargandoVista ? (
            <SkeletonLine className="garagista-skeleton-line--capacity" />
          ) : (
            <span>{cantidadAutosDentro} / {capacidadTotal || "—"} dentro</span>
          )}
        </div>
      </section>

      <label className="garagista-search">
        <Search size={20} />
        <input
          type="search"
          placeholder="Buscar por conductor o vehículo..."
          value={busqueda}
          onChange={(event) => onBusquedaChange(event.target.value)}
        />
      </label>
    </>
  );
}

export default GaragistaEncabezado;
