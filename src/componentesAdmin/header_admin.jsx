import UserDropdown from "../components/UserDropdown";
import CampanaNotificaciones from "../componentesCompartidos/CampanaNotificaciones";
import HeaderShell from "../componentesCompartidos/HeaderShell";
import { useAuth } from "../contexts/useAuth";
import { ROLE_NAMES, userHasRole } from "../helpers/roles";

function Header({ homePath = "/admin_dashboard" }) {
  const { usuario } = useAuth();
  const esAdmin = userHasRole(usuario, ROLE_NAMES.ADMIN);

  return (
    <HeaderShell homePath={homePath} className="header">
      {esAdmin ? <CampanaNotificaciones rutaTratos="/gestion_garages" /> : null}
      <UserDropdown />
    </HeaderShell>
  );
}

export default Header;
