export function EmpleadoDashboardIntroSkeleton() {
  return (
    <div className="empleado-dashboard-intro empleado-dashboard-intro-skeleton" aria-label="Cargando datos del empleado">
      <span className="empleado-skeleton-line empleado-skeleton-kicker" />
      <span className="empleado-skeleton-line empleado-skeleton-title" />
      <span className="empleado-skeleton-line empleado-skeleton-subtitle" />
    </div>
  );
}

export function EmpleadoReservasSkeleton() {
  return (
    <div className="empleado-reservas-skeleton-list" aria-label="Cargando reservas">
      {Array.from({ length: 1 }).map((_, index) => (
        <section className="empleado-reservas-section" key={index}>
          <article className="empleado-reserva-card empleado-reserva-card-skeleton">
            <span className="empleado-skeleton-block empleado-skeleton-reserva-plaza" />
            <div className="empleado-skeleton-reserva-info">
              <span className="empleado-skeleton-line empleado-skeleton-reserva-title" />
              <span className="empleado-skeleton-line empleado-skeleton-reserva-text" />
            </div>
            <span className="empleado-skeleton-block empleado-skeleton-reserva-action" />
          </article>
        </section>
      ))}
    </div>
  );
}
