import { obtenerClaseEstado } from "./control_acceso_helpers";

function BadgeEstado({ estado }) {
  return (
    <span className={`garagista-status garagista-status--${obtenerClaseEstado(estado)}`}>
      {estado}
    </span>
  );
}

export default BadgeEstado;
