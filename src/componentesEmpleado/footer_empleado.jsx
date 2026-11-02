import {
  House,
  BookCheck,
  ClipboardClock,
  UserRound,
} from "lucide-react";
import FooterNav from "../componentesCompartidos/FooterNav";

const FOOTER_STORAGE_KEY = "smartlot-footer-active-index";

const FOOTER_ITEMS = [
  {
    label: "INICIO",
    path: "/empleados_dashboard",
    icon: <House size={28} />,
  },
  {
    label: "RESERVA",
    path: "/nueva_reserva",
    icon: <BookCheck size={28} />,
  },
  {
    label: "HISTORIAL",
    path: "/historial_reserva",
    icon: <ClipboardClock size={28} />,
  },
  {
    label: "PERFIL",
    path: "/perfil_empleado",
    icon: <UserRound size={28} />,
  },
];

function FooterEmpleado() {
  return (
    <FooterNav
      items={FOOTER_ITEMS}
      storageKey={FOOTER_STORAGE_KEY}
      ariaLabel="Navegacion principal del empleado"
      className="footer-empleado"
    />
  );
}

export default FooterEmpleado;
