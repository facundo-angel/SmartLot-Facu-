import {
  House,
  CarFront,
  UsersRound,
  ChartBarDecreasing,
  CreditCard,
} from "lucide-react";
import FooterNav from "../componentesCompartidos/FooterNav";

const FOOTER_STORAGE_KEY = "smartlot-footer-admin-active-index";

const FOOTER_ITEMS = [
  {
    label: "INICIO",
    path: "/admin_dashboard",
    icon: <House size={28} />,
  },
  {
    label: "GARAGE",
    path: "/gestion_garages",
    icon: <CarFront size={28} />,
  },
  {
    label: "GESTION",
    path: "/gestion_de_empleados",
    icon: <UsersRound size={28} />,
  },
  {
    label: "PANEL",
    path: "/admin_panel_de_control",
    icon: <ChartBarDecreasing size={28} />,
  },
  {
    label: "PAGOS",
    path: "/admin_pagos",
    icon: <CreditCard size={28} />,
  },
];

function FooterAdmin() {
  return (
    <FooterNav
      items={FOOTER_ITEMS}
      storageKey={FOOTER_STORAGE_KEY}
      ariaLabel="Navegacion principal del administrador"
      className="footer-admin"
    />
  );
}

export default FooterAdmin;
