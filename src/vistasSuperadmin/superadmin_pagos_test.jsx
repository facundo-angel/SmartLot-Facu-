import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CalendarClock, Search, Wallet } from "lucide-react";
import { initMercadoPago } from "@mercadopago/sdk-react";

import "./superadmin_pagos_test.css";
import HeaderSuperadmin from "../componentesSuperadmin/header_superadmin";
import FooterSuperadmin from "../componentesSuperadmin/footer_superadmin";
import CrearPagoTab from "../componentesSuperadmin/pagos_test/crear_pago_tab";
import ConsultarPagosTab from "../componentesSuperadmin/pagos_test/consultar_pagos_tab";
import WebhooksTab from "../componentesSuperadmin/pagos_test/webhooks_tab";
import ReembolsosTab from "../componentesSuperadmin/pagos_test/reembolsos_tab";

initMercadoPago(import.meta.env.VITE_MP_PUBLIC_KEY);

const TABS = [
  { id: "crear", label: "Crear pago", icon: Wallet },
  { id: "consultar", label: "Consultar pagos", icon: Search },
  { id: "webhooks", label: "Webhooks", icon: CalendarClock },
  { id: "reembolsos", label: "Reembolsos", icon: ArrowUpRight },
];

export default function SuperadminPagosTest() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("crear");

  const irAConsultar = () => setTab("consultar");

  return (
    <div className="mpt-page">
      <HeaderSuperadmin />
      <main className="mpt-main">
        <header className="mpt-header">
          <div className="mpt-title-row">
            <button type="button" className="mpt-back" onClick={() => navigate("/superadmin_dashboard")} aria-label="Volver al panel de control">
              <ArrowLeft size={19} />
            </button>
            <div>
              <span className="mpt-eyebrow">Sandbox de pagos</span>
              <h1>Testing Mercado Pago</h1>
              <p>Creá preferencias, pagá con Checkout Pro, verificá estados, webhooks y reembolsos.</p>
            </div>
          </div>
        </header>

        <nav className="mpt-tabs" aria-label="Secciones de testing">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`mpt-tab ${tab === id ? "mpt-tab--active" : ""}`}
              onClick={() => setTab(id)}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        {tab === "crear" && <CrearPagoTab onPagoVerificado={irAConsultar} />}
        {tab === "consultar" && <ConsultarPagosTab />}
        {tab === "webhooks" && <WebhooksTab />}
        {tab === "reembolsos" && <ReembolsosTab onVerificarPago={irAConsultar} />}
      </main>
      <FooterSuperadmin />
    </div>
  );
}
