import { useEffect, useState } from "react";
import { BadgeCheck, CalendarClock, Loader2, RefreshCw } from "lucide-react";
import Swal from "sweetalert2";

import { PagosWebhookEventos } from "../../servicies/API_Pagos";
import { formatearFecha } from "./pagos_test_utils";
import { EmptyTab, EstadoBadge } from "./pagos_test_ui";

function formatearEvento(fila) {
  const payload = typeof fila.payload === "string" ? JSON.parse(fila.payload) : fila.payload;
  return {
    id: fila.mp_event_id,
    tipo: fila.tipo_evento,
    paymentId: fila.mp_payment_id,
    procesado: fila.procesado,
    error: fila.error_procesamiento,
    fecha: formatearFecha(fila.fecha_recepcion),
    fechaProcesamiento: formatearFecha(fila.fecha_procesamiento),
    payload,
  };
}

export default function WebhooksTab() {
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargado, setCargado] = useState(false);

  const aplicarRespuesta = (res) => {
    setCargado(true);
    setCargando(false);

    if (!res.respuesta) {
      const mensaje = res.status === 404 ? "El endpoint de webhooks todavía no está disponible en el backend." : res.datos?.message || "No se pudieron cargar los webhooks";
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: mensaje, showConfirmButton: false, timer: 4000 });
      setEventos([]);
      return;
    }

    setEventos(Array.isArray(res.datos) ? res.datos : []);
  };

  const cargar = async () => {
    setCargando(true);
    const res = await PagosWebhookEventos();
    aplicarRespuesta(res);
  };

  useEffect(() => {
    let mounted = true;
    const inicializar = async () => {
      const res = await PagosWebhookEventos();
      if (!mounted) return;
      aplicarRespuesta(res);
    };
    inicializar();
    return () => { mounted = false; };
  }, []);

  const eventosFormateados = eventos.map(formatearEvento);

  return (
    <div className="mpt-scroll">
      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div>
            <h3>Eventos recibidos por el webhook</h3>
            <p>Registro de <code>webhook_eventos</code> persistiendo los avisos de Mercado Pago al backend.</p>
          </div>
          <button type="button" className="mpt-btn mpt-btn--ghost" onClick={cargar} disabled={cargando}>
            <RefreshCw size={16} className={cargando ? "mpt-spin" : ""} /> Actualizar
          </button>
        </div>

        {cargando ? (
          <div className="mpt-loading-row"><Loader2 className="mpt-spin" size={18} /> Cargando eventos…</div>
        ) : eventosFormateados.length ? (
          <>
            <div className="mpt-table-wrap">
              <table className="mpt-table">
                <thead>
                  <tr><th>Evento</th><th>Tipo</th><th>Payment ID</th><th>Recibido</th><th>Procesado</th><th>Error</th></tr>
                </thead>
                <tbody>
                  {eventosFormateados.map((evento) => (
                    <tr key={evento.id}>
                      <td><code>{evento.id}</code></td>
                      <td><EstadoBadge estado={evento.tipo} /></td>
                      <td><code>{evento.paymentId || "—"}</code></td>
                      <td>{evento.fecha}</td>
                      <td>
                        {evento.procesado
                          ? <span className="mpt-ok"><BadgeCheck size={15} /> {evento.fechaProcesamiento}</span>
                          : <span className="mpt-pendiente">Pendiente</span>}
                      </td>
                      <td className="mpt-table__error">{evento.error || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyTab icono={<CalendarClock size={28} />} titulo="No hay eventos todavía" detalle={cargado ? "Cuando Mercado Pago envíe avisos, aparecerán acá." : "Cargando…"} />
        )}
      </section>
    </div>
  );
}
