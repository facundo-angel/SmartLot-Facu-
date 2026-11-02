import { Building2, CirclePlus, ClipboardList, HandCoins, UserRound } from "lucide-react";
import FooterNav from "../componentesCompartidos/FooterNav";
import { useSolicitudesPendientesCount } from "../hooks/useSolicitudesPendientesCount";
import "./footer_dueño_garage.css";

const FOOTER_STORAGE_KEY = "smartlot-footer-duenio-garage-active-index";

const ITEMS = [
  { label: "Garages", path: "/duenio-garage/dashboard", icon: <Building2 size={24} /> },
  { label: "Crear", path: "/duenio-garage/crear-garage", icon: <CirclePlus size={24} /> },
  { label: "Tratos", path: "/duenio-garage/tratos", icon: <ClipboardList size={24} /> },
  { label: "Por cobrar", path: "/duenio-garage/cuentas-por-cobrar", icon: <HandCoins size={24} /> },
  { label: "Perfil", path: "/duenio-garage/perfil", icon: <UserRound size={24} /> },
];

function FooterDueñoGarage() {
  const { count, loading } = useSolicitudesPendientesCount();

  return (
    <FooterNav
      items={ITEMS}
      storageKey={FOOTER_STORAGE_KEY}
      ariaLabel="Navegacion del dueño de garage"
      className="duenio-footer"
      badgePath="/duenio-garage/tratos"
      badgeCount={count}
      badgeLoading={loading}
    />
  );
}

export default FooterDueñoGarage;
