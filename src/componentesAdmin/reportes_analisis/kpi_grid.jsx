import { useEffect, useRef, useState } from "react";

const AnimatedNumber = ({ value, suffix = "", duration = 1800, startDelay = 0 }) => {
  const [display, setDisplay] = useState(0);
  const [highlight, setHighlight] = useState(false);
  const rafRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (typeof value !== "number") return;

    timerRef.current = setTimeout(() => {
      setHighlight(true);
      const startTime = performance.now();
      const to = Math.max(0, value);
      const step = (now) => {
        const t = Math.min((now - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        setDisplay(Math.round(to * ease));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          setHighlight(false);
        }
      };
      rafRef.current = requestAnimationFrame(step);
    }, startDelay);

    return () => {
      clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, startDelay]);

  if (typeof value !== "number") return <>{value}</>;
  return <span className={highlight ? "kpi-counter--highlight" : ""}>{display.toLocaleString()}{suffix}</span>;
};

export default function KpiGrid({ kpis }) {
  return (
    <section className="kpi-grid">
      {kpis.map((kpi, i) => (
        <article className="kpi-card" key={kpi.label} style={{ animationDelay: `${0.15 + i * 0.08}s` }}>
          <div className="kpi-card__header">
            <div className="kpi-card__icon-wrapper" style={{ backgroundColor: kpi.bg, color: kpi.color }}>
              <kpi.icon size={22} />
            </div>
            <span className="kpi-card__label">{kpi.label}</span>
          </div>
          <span className="kpi-card__value kpi-card__value--animate">
            {kpi.raw !== undefined ? (
              <AnimatedNumber value={kpi.raw} suffix={kpi.suffix || ""} startDelay={(0.65 + i * 0.08) * 1000} />
            ) : (
              kpi.value
            )}
          </span>
        </article>
      ))}
    </section>
  );
}
