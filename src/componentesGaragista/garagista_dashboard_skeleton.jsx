const SKELETON_CARD_KEYS = ["reserva-1", "reserva-2", "reserva-3"];
const SKELETON_MOVEMENT_KEYS = ["movimiento-1", "movimiento-2", "movimiento-3"];

export function SkeletonLine({ className = "" }) {
  return <span className={`garagista-skeleton-line ${className}`} aria-hidden="true" />;
}

function SkeletonAccessCard() {
  return (
    <article className="access-card access-card--skeleton" aria-hidden="true">
      <div className="access-card__top">
        <div className="garagista-skeleton-stack">
          <SkeletonLine className="garagista-skeleton-line--title" />
          <SkeletonLine className="garagista-skeleton-line--text" />
        </div>
        <SkeletonLine className="garagista-skeleton-line--badge" />
      </div>

      <dl className="access-card__meta">
        <div>
          <SkeletonLine className="garagista-skeleton-line--label" />
          <SkeletonLine className="garagista-skeleton-line--value" />
        </div>
        <div>
          <SkeletonLine className="garagista-skeleton-line--label" />
          <SkeletonLine className="garagista-skeleton-line--value garagista-skeleton-line--short" />
        </div>
      </dl>

      <SkeletonLine className="garagista-skeleton-line--button" />
    </article>
  );
}

function GaragistaDashboardSkeleton() {
  return (
    <div className="garagista-skeleton" role="status" aria-label="Cargando datos del garage">
      <div className="garagista-mobile-tabs garagista-skeleton-tabs" aria-hidden="true">
        <SkeletonLine className="garagista-skeleton-line--tab" />
        <SkeletonLine className="garagista-skeleton-line--tab" />
      </div>

      <div className="garagista-sections-grid">
        {["Ingresos pendientes", "Autos dentro"].map((titulo) => (
          <section className="garagista-section garagista-mobile-panel is-active" key={titulo}>
            <div className="garagista-section-heading" aria-hidden="true">
              <div>
                <SkeletonLine className="garagista-skeleton-line--eyebrow" />
                <SkeletonLine className="garagista-skeleton-line--heading" />
              </div>
              <SkeletonLine className="garagista-skeleton-line--count" />
            </div>

            <div className="garagista-card-list">
              {SKELETON_CARD_KEYS.map((key) => (
                <SkeletonAccessCard key={`${titulo}-${key}`} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="garagista-section garagista-section--movements">
        <div className="garagista-section-heading" aria-hidden="true">
          <div>
            <SkeletonLine className="garagista-skeleton-line--eyebrow" />
            <SkeletonLine className="garagista-skeleton-line--heading" />
          </div>
          <SkeletonLine className="garagista-skeleton-line--count" />
        </div>

        <div className="movements-list" aria-hidden="true">
          {SKELETON_MOVEMENT_KEYS.map((key) => (
            <article className="movement-row movement-row--skeleton" key={key}>
              <div className="garagista-skeleton-stack">
                <SkeletonLine className="garagista-skeleton-line--title" />
                <SkeletonLine className="garagista-skeleton-line--text" />
              </div>
              <SkeletonLine className="garagista-skeleton-line--badge" />
              <SkeletonLine className="garagista-skeleton-line--value" />
              <SkeletonLine className="garagista-skeleton-line--value" />
              <SkeletonLine className="garagista-skeleton-line--value" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default GaragistaDashboardSkeleton;
