import UserDropdown from "../components/UserDropdown";
import CampanaNotificaciones from "../componentesCompartidos/CampanaNotificaciones";
import HeaderShell from "../componentesCompartidos/HeaderShell";
import "./header_superadmin.css";

function HeaderSuperadmin() {
  return (
    <HeaderShell
      className="header-superadmin"
      leftClassName="header-superadmin-left"
      rightClassName="header-superadmin-right"
      logoClassName="logo-superadmin"
      spacerClassName={null}
      homePath="/superadmin_dashboard"
      leftExtra={<span className="header-superadmin-badge">Superadmin</span>}
    >
      <CampanaNotificaciones
        rutaTratos="/superadmin/conflictos"
        ctaTexto="Ver conflictos"
        emptyDescription="Cuando haya novedades de la plataforma, aparecerán acá."
      />
      <UserDropdown />
    </HeaderShell>
  );
}

export default HeaderSuperadmin;
