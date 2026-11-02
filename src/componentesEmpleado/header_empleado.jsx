import { useEffect } from "react";
import UserDropdown from "../components/UserDropdown";
import CampanaNotificaciones from "../componentesCompartidos/CampanaNotificaciones";
import HeaderShell from "../componentesCompartidos/HeaderShell";

const aplicarTemaEmpleado = () => {
  try {
    const config = JSON.parse(localStorage.getItem("smartlot_empleado_config")) || {};
    document.documentElement.dataset.empleadoTheme = config.tema === "oscuro" ? "oscuro" : "claro";
  } catch {
    document.documentElement.dataset.empleadoTheme = "claro";
  }
};

function HeaderEmpleado() {
  useEffect(() => {
    aplicarTemaEmpleado();
  }, []);

  return (
    <HeaderShell homePath="/empleados_dashboard" className="header">
      <CampanaNotificaciones
        rutaTratos="/historial_reserva"
        ctaTexto="Ver historial"
        emptyDescription="Cuando haya novedades sobre tus reservas, aparecerán acá."
      />
      <UserDropdown />
    </HeaderShell>
  );
}

export default HeaderEmpleado;
