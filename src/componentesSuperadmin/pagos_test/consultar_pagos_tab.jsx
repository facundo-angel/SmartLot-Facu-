import { useEffect, useState } from "react";
import { Loader2, Search, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";

import { PagosBuscar } from "../../servicies/API_Pagos";
import { formatearFecha, formatearImporte } from "./pagos_test_utils";
import { EmptyTab, EstadoBadge } from "./pagos_test_ui";

const ESTADOS_FILTRO = ["", "approved", "pending", "in_process", "rejected", "cancelled", "refunded", "charged_back"];

function DetallePagoDrawer({ pago, onClose }) {
  useEffect(() => {
    if (!pago) return undefined;
    const handleKeyDown = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("mpt-modal-open");
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("mpt-modal-open");
    };
  }, [pago, onClose]);

  if (!pago) return null;

  const detalles = [
    ["ID de pago", pago.id || pago.mp_payment_id],
    ["Preferencia", pago.preferenceId || pago.preference_id || pago.mp_preference_id],
    ["Referencia externa", pago.externalReference || pago.external_reference || pago.id_orden_externa],
    ["Monto", formatearImporte(pago.transactionAmount ?? pago.transaction_amount ?? pago.monto)],
    ["Moneda", pago.currency || pago.currency_id || pago.moneda],
    ["Tipo", pago.paymentType || pago.payment_type_id || pago.mp_payment_type],
    ["Descripción", pago.description || pago.descripcion],
    ["Aprobado", formatearFecha(pago.dateApproved || pago.date_approved || pago.fecha_aprobacion)],
    ["Creado", formatearFecha(pago.dateCreated || pago.date_created || pago.fecha_creacion)],
  ];

  return (
    <div className="mpt-drawer-overlay" role="presentation" onMouseDown={onClose}>
      <aside className="mpt-drawer" role="dialog" aria-modal="true" aria-labelledby="mpt-drawer-titulo" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mpt-drawer__header">
          <div>
            <span className="mpt-eyebrow">Detalle de pago</span>
            <h2 id="mpt-drawer-titulo">Pago {pago.id || pago.mp_payment_id}</h2>
          </div>
          <button className="mpt-icon-btn" type="button" onClick={onClose} aria-label="Cerrar detalle"><X size={19} /></button>
        </div>

        <EstadoBadge estado={pago.status || pago.mp_payment_status} />
        {pago.status_detail ? <p className="mpt-drawer__detail">{pago.status_detail}</p> : null}

        <div className="mpt-drawer__divider" />
        <dl className="mpt-drawer__list">
          {detalles.map(([dt, dd]) => (
            <div key={dt}><dt>{dt}</dt><dd>{dd ?? "—"}</dd></div>
          ))}
        </dl>

        {pago.metadata && typeof pago.metadata === "object" ? (
          <details className="mpt-raw">
            <summary>Metadata completa</summary>
            <pre>{JSON.stringify(pago.metadata, null, 2)}</pre>
          </details>
        ) : null}
      </aside>
    </div>
  );
}

export default function ConsultarPagosTab() {
  const [filtros, setFiltros] = useState({ external_reference: "", status: "", from: "", to: "" });
  const [pagos, setPagos] = useState([]);
  const [paginacion, setPaginacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);

  const buscar = async () => {
    setCargando(true);
    setBuscado(true);
    const res = await PagosBuscar(filtros);
    setCargando(false);

    if (!res.respuesta) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: res.datos?.message || "No se pudieron buscar los pagos", showConfirmButton: false, timer: 4000 });
      return;
    }

    const lista = res.datos?.results || res.datos?.pagos || [];
    setPagos(Array.isArray(lista) ? lista : []);
    setPaginacion(res.datos?.paging || null);
  };

  const limpiar = () => {
    setFiltros({ external_reference: "", status: "", from: "", to: "" });
    setPagos([]);
    setBuscado(false);
    setPaginacion(null);
  };

  const hayFiltros = Boolean(filtros.external_reference || filtros.status || filtros.from || filtros.to);

  return (
    <div className="mpt-scroll">
      <section className="mpt-card mpt-card--full">
        <div className="mpt-filters">
          <label className="mpt-search">
            <Search size={17} />
            <input
              type="text"
              value={filtros.external_reference}
              onChange={(e) => setFiltros((f) => ({ ...f, external_reference: e.target.value }))}
              placeholder="external_reference (orderId)"
            />
          </label>
          <label><span>Estado</span>
            <select value={filtros.status} onChange={(e) => setFiltros((f) => ({ ...f, status: e.target.value }))}>
              {ESTADOS_FILTRO.map((estado) => <option key={estado} value={estado}>{estado || "Todos"}</option>)}
            </select>
          </label>
          <label><span>Desde</span><input type="date" value={filtros.from} onChange={(e) => setFiltros((f) => ({ ...f, from: e.target.value }))} /></label>
          <label><span>Hasta</span><input type="date" value={filtros.to} onChange={(e) => setFiltros((f) => ({ ...f, to: e.target.value }))} /></label>
          <button type="button" className="mpt-btn mpt-btn--primary" onClick={buscar} disabled={cargando}>
            {cargando ? <Loader2 className="mpt-spin" size={17} /> : <Search size={17} />}
            {cargando ? "Buscando…" : "Buscar"}
          </button>
          <button type="button" className="mpt-btn mpt-btn--ghost" onClick={limpiar} disabled={!hayFiltros && !buscado}>
            <Trash2 size={16} /> Limpiar
          </button>
        </div>
      </section>

      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div><h3>Resultados</h3><p>{paginacion ? `${paginacion.total ?? pagos.length} pagos encontrados` : buscado ? `${pagos.length} pagos encontrados` : "Usá los filtros para buscar pagos en Mercado Pago."}</p></div>
        </div>

        {pagos.length ? (
          <>
            <div className="mpt-table-wrap">
              <table className="mpt-table">
                <thead>
                  <tr><th>ID pago</th><th>Referencia</th><th>Monto</th><th>Estado</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {pagos.map((pago) => (
                    <tr key={pago.id}>
                      <td><code>{pago.id}</code></td>
                      <td>{pago.externalReference || pago.external_reference || pago.id_orden_externa || "—"}</td>
                      <td className="mpt-table__amount">{formatearImporte(pago.transactionAmount ?? pago.transaction_amount ?? pago.monto)}</td>
                      <td><EstadoBadge estado={pago.status || pago.mp_payment_status} /></td>
                      <td>{formatearFecha(pago.dateCreated || pago.date_created || pago.fecha_creacion)}</td>
                      <td><button type="button" className="mpt-link-btn" onClick={() => setPagoSeleccionado(pago)}>Ver detalle</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mpt-mobile-list">
              {pagos.map((pago) => (
                <article className="mpt-mobile-card" key={pago.id}>
                  <div className="mpt-mobile-card__top"><strong><code>{pago.id}</code></strong><EstadoBadge estado={pago.status || pago.mp_payment_status} /></div>
                  <span>{pago.externalReference || pago.external_reference || pago.id_orden_externa || "Sin referencia"}</span>
                  <div className="mpt-mobile-card__bottom">
                    <strong>{formatearImporte(pago.transactionAmount ?? pago.transaction_amount ?? pago.monto)}</strong>
                    <button type="button" className="mpt-link-btn" onClick={() => setPagoSeleccionado(pago)}>Ver detalle</button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <EmptyTab icono={<Search size={28} />} titulo="Sin resultados" detalle={buscado ? "No se encontraron pagos con esos filtros." : "Busca un pago por ID, referencia o estado."} accion={buscado ? { label: "Limpiar filtros", onClick: limpiar } : undefined} />
        )}
      </section>

      <DetallePagoDrawer pago={pagoSeleccionado} onClose={() => setPagoSeleccionado(null)} />
    </div>
  );
}
