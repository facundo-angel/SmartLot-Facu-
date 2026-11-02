import {
  House,
  Building2,
  MessageSquareWarning,
  Users,
} from "lucide-react";
import FooterNav from "../componentesCompartidos/FooterNav";

const FOOTER_STORAGE_KEY = "smartlot-footer-superadmin-active-index";

const FOOTER_ITEMS = [
  {
    label: "INICIO",
    path: "/superadmin_dashboard",
    icon: <House size={28} />,
  },
  {
    label: "EMPRESAS",
    path: "/superadmin/gestion_empresas",
    icon: <Building2 size={28} />,
  },
  {
    label: "USUARIOS",
    path: "/superadmin/gestion_usuarios",
    icon: <Users size={28} />,
  },
  {
    label: "CONFLICTOS",
    path: "/superadmin/conflictos",
    icon: <MessageSquareWarning size={28} />,
  },
];

function FooterSuperadmin() {
  return (
    <FooterNav
      items={FOOTER_ITEMS}
      storageKey={FOOTER_STORAGE_KEY}
      ariaLabel="Navegacion principal del superadministrador"
      className="footer-superadmin"
      theme="oscuro"
    />
  );
}

export default FooterSuperadmin;
