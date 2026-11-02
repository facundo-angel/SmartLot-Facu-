import { useRef } from "react";
import { Star, CarFront, Minus, Plus } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import FieldValidation from "../components/FieldValidation";
import "./formulario_capacidad.css";

gsap.registerPlugin(useGSAP);

const numberFormat = new Intl.NumberFormat("es-AR");
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function AnimatedNumber({ value }) {
  const numberRef = useRef(null);
  const previousValueRef = useRef(value);

  useGSAP(() => {
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (previousValue === value || prefersReducedMotion()) return;

    gsap.from(numberRef.current, {
      rotateX: -85,
      opacity: 0,
      duration: 0.32,
      ease: "power2.out",
      transformPerspective: 420,
      transformOrigin: "50% 100%",
    });
  }, { dependencies: [value], revertOnUpdate: true });

  return <strong ref={numberRef} className="cap-anim-num">{numberFormat.format(value)}</strong>;
}

function FormularioCapacidad({ formData = {}, onChange, fieldsValidation = {} }) {
  const containerRef = useRef(null);

  const capacidadReservas = Number(formData.capacidad_reservas) || 0;
  const capacidadNoReservas = Number(formData.capacidad_para_no_reservas) || 0;
  const capacidad = capacidadReservas + capacidadNoReservas;

  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.from(".cap-total, .cap-card", {
      opacity: 0,
      y: 16,
      duration: 0.45,
      stagger: 0.1,
      ease: "power2.out",
    });
  }, { scope: containerRef });

  const handleUpdate = (field, newValue) => {
    if (!onChange) return;

    const sanitizedValue = Math.max(0, newValue);

    onChange({
      ...formData,
      [field]: sanitizedValue,
    });
  };

  return (
    <div className="formulario-capacidad" ref={containerRef}>
      <div className="cap-header">
        <h3>Capacidad del Establecimiento</h3>
        <p>Configura la distribución de plazas disponibles en tiempo real.</p>
      </div>

      <div className="cap-total">
        <div className="cap-total-row">
          <span>Capacidad total del garage</span>
          <ul className="cap-total-chips">
            <li className="cap-chip">
              <AnimatedNumber value={capacidadReservas} />
              <span>con reserva</span>
            </li>
            <li className="cap-chip">
              <AnimatedNumber value={capacidadNoReservas} />
              <span>sin reserva</span>
            </li>
          </ul>
        </div>

        <p className="cap-total-value" aria-live="polite" aria-atomic="true">
          <AnimatedNumber value={capacidad} />
          <span>{capacidad === 1 ? "plaza" : "plazas"}</span>
        </p>

        <div className="cap-split" aria-hidden="true">
          <span className="cap-split-seg cap-split-seg--reservas" style={{ flexGrow: capacidadReservas }} />
          <span className="cap-split-seg cap-split-seg--libres" style={{ flexGrow: capacidadNoReservas }} />
        </div>
      </div>

      <div className="cap-grid">
        <div className="cap-card">
          <div className="cap-card-top">
            <div className="cap-card-icon">
              <Star size={18} />
            </div>
            <span className="cap-card-tag">RESERVAS</span>
          </div>

          <h4>Capacidad Reservas</h4>
          <p>Ubicaciones para usuarios con reserva.</p>

          <div className="cap-stepper">
            <button
              type="button"
              onClick={() => handleUpdate("capacidad_reservas", capacidadReservas - 1)}
              disabled={capacidadReservas <= 0}
              aria-label="Disminuir capacidad de reservas"
            >
              <Minus size={16} />
            </button>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={capacidadReservas}
              aria-label="Capacidad de reservas"
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                handleUpdate("capacidad_reservas", Number.isNaN(value) ? 0 : value);
              }}
              required
            />

            <button
              type="button"
              onClick={() => handleUpdate("capacidad_reservas", capacidadReservas + 1)}
              aria-label="Aumentar capacidad de reservas"
            >
              <Plus size={16} />
            </button>
          </div>

          {fieldsValidation.capacidad_reservas && (
            <FieldValidation
              conditions={fieldsValidation.capacidad_reservas.conditions}
              isTouched={fieldsValidation.capacidad_reservas.isTouched}
            />
          )}
        </div>

        <div className="cap-card">
          <div className="cap-card-top">
            <div className="cap-card-icon">
              <CarFront size={18} />
            </div>
            <span className="cap-card-tag">NO RESERVAS</span>
          </div>

          <h4>Capacidad No Reservas</h4>
          <p>Plazas de uso general por llegada.</p>

          <div className="cap-stepper">
            <button
              type="button"
              onClick={() => handleUpdate("capacidad_para_no_reservas", capacidadNoReservas - 1)}
              disabled={capacidadNoReservas <= 0}
              aria-label="Disminuir capacidad de no reservas"
            >
              <Minus size={16} />
            </button>

            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={capacidadNoReservas}
              aria-label="Capacidad de no reservas"
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                handleUpdate("capacidad_para_no_reservas", Number.isNaN(value) ? 0 : value);
              }}
              required
            />

            <button
              type="button"
              onClick={() => handleUpdate("capacidad_para_no_reservas", capacidadNoReservas + 1)}
              aria-label="Aumentar capacidad de no reservas"
            >
              <Plus size={16} />
            </button>
          </div>

          {fieldsValidation.capacidad_para_no_reservas && (
            <FieldValidation
              conditions={fieldsValidation.capacidad_para_no_reservas.conditions}
              isTouched={fieldsValidation.capacidad_para_no_reservas.isTouched}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FormularioCapacidad;
