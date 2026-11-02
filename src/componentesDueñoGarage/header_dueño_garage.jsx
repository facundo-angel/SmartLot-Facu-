import UserDropdown from "../components/UserDropdown";
import CampanaNotificaciones from "../componentesCompartidos/CampanaNotificaciones";
import HeaderShell from "../componentesCompartidos/HeaderShell";
import "./header_dueño_garage.css";

function HeaderDueñoGarage() {
  return (
    <HeaderShell
      as="header"
      className="duenio-header"
      leftClassName="duenio-header-left"
      rightClassName="duenio-header-right"
      logoClassName="duenio-logo-smartlot"
      spacerClassName="duenio-header-spacer"
      homePath="/duenio-garage/dashboard"
    >
      <CampanaNotificaciones rutaTratos="/duenio-garage/tratos" />
      <UserDropdown />
    </HeaderShell>
  );
}

export default HeaderDueñoGarage;
