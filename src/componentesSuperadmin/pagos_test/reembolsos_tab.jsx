import { useState } from "react";
import { ArrowUpRight, BadgeCheck, CircleDollarSign, CreditCard, FileText, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

import { PagosReembolsar } from "../../servicies/API_Pagos";
import { formatearImporte } from "./pagos_test_utils";
import { EstadoBadge } from "./pagos_test_ui";

export default function ReembolsosTab({ onVerificarPago }) {
  const [paymentId, setPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [motivo, setMotivo] = useState("");
  const [reembolsando, setReembolsando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const ejecutar = async () => {
    if (!paymentId.trim()) {
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "Ingresá el payment_id", showConfirmButton: false, timer: 2500 });
      return;
    }

    setReembolsando(true);
    setResultado(null);

    const amountValue = amount === "" ? undefined : Number(amount);
    const res = await PagosReembolsar(paymentId.trim(), amountValue, motivo.trim() || undefined);
    setReembolsando(false);

    if (!res.respuesta) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: res.datos?.message || "No se pudo reembolsar", showConfirmButton: false, timer: 4000 });
      return;
    }

    setResultado(res.datos);
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: "Reembolso ejecutado", showConfirmButton: false, timer: 2500 });
    onVerificarPago?.(paymentId.trim());
  };

  return (
    <div className="mpt-scroll">
      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div>
            <h3>Reembolso de pagos</h3>
            <p>Total si no ingresás monto, parcial si ingresás un importe menor. Requiere un pago aprobado.</p>
          </div>
        </div>

        <div className="mpt-reembolso-grid">
          <label className="mpt-field">
            <span><CreditCard size={15} /> Payment ID</span>
            <input type="text" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="payment_id aprobado" />
          </label>
          <label className="mpt-field">
            <span><CircleDollarSign size={15} /> Monto (opcional)</span>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Vacío = reembolso total" />
          </label>
          <label className="mpt-field">
            <span><FileText size={15} /> Motivo (opcional)</span>
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: cancelación de reserva" />
          </label>
        </div>

        <button type="button" className="mpt-btn mpt-btn--refund" onClick={ejecutar} disabled={reembolsando}>
          {reembolsando ? <Loader2 className="mpt-spin" size={17} /> : <ArrowUpRight size={17} />}
          {reembolsando ? "Reembolsando…" : "Ejecutar reembolso"}
        </button>

        {resultado ? (
          <div className="mpt-resultado mpt-resultado--ok">
            <div className="mpt-resultado__icon"><BadgeCheck size={26} /></div>
            <div className="mpt-resultado__info">
              <div><EstadoBadge estado={resultado.status || resultado.estado} /></div>
              <dl>
                <div><dt>Refund ID</dt><dd>{resultado.refundId || resultado.id}</dd></div>
                <div><dt>Monto</dt><dd>{formatearImporte(resultado.amount)}</dd></div>
                <div><dt>Estado</dt><dd>{resultado.status || resultado.estado || "—"}</dd></div>
              </dl>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
