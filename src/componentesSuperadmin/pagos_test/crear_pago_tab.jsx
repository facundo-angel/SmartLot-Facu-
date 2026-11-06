import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCopy,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";

import { EmpresasGetAll } from "../../servicies/API_Empresa";
import { SedesGetAll } from "../../servicies/API_Sede";
import { GaragesGetAll } from "../../servicies/API_Garage";
import {
  PagosCrearPreferencia,
  PagosGetById,
  PagosBuscar,
} from "../../servicies/API_Pagos";
import {
  copiar,
  estadoClase,
  formatearFecha,
  formatearImporte,
  obtenerListado,
} from "./pagos_test_utils";
import { EstadoBadge } from "./pagos_test_ui";

const TARJETAS_PRUEBA = [
  { id: "visa", marca: "Visa", numero: "4509 9535 6623 3704", cvv: "123", color: "#1A1F71", tipo: "Crédito" },
  { id: "mastercard", marca: "Mastercard", numero: "5031 7557 3453 0604", cvv: "123", color: "#EB001B", tipo: "Crédito" },
  { id: "amex", marca: "Amex", numero: "3711 803032 57522", cvv: "1234", color: "#006FCF", tipo: "Crédito" },
];

const PRECIOS_RAPIDOS = [500, 1000, 2000, 5000, 10000];

function TarjetaVisual({ tarjeta, activa }) {
  return (
    <div className={`mpt-card-sample ${activa ? "mpt-card-sample--active" : ""}`} style={{ background: `linear-gradient(135deg, ${tarjeta.color}, ${tarjeta.color}cc)` }}>
      <div className="mpt-card-sample__chip" />
      <strong>{tarjeta.numero}</strong>
      <div><span>CVV {tarjeta.cvv}</span><span>{tarjeta.tipo}</span></div>
    </div>
  );
}

export default function CrearPagoTab({ onPagoVerificado }) {
  const [empresas, setEmpresas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [garages, setGarages] = useState([]);
  const [cargandoOrigenes, setCargandoOrigenes] = useState(true);

  const [idEmpresa, setIdEmpresa] = useState("");
  const [idSede, setIdSede] = useState("");
  const [idGarage, setIdGarage] = useState("");

  const [monto, setMonto] = useState(1000);
  const [montoCustom, setMontoCustom] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [orderId, setOrderId] = useState(() => "TEST-" + Date.now());
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState("visa");

  const [creandoPreferencia, setCreandoPreferencia] = useState(false);
  const [preferencia, setPreferencia] = useState(null);

  const [paymentIdVerificar, setPaymentIdVerificar] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [pagoVerificado, setPagoVerificado] = useState(null);
  const [buscandoPorOrder, setBuscandoPorOrder] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollingIntento, setPollingIntento] = useState(0);
  const pollingRef = useRef(null);
  const pollingOrderRef = useRef("");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setCargandoOrigenes(true);
      const [empresasRes, sedesRes, garagesRes] = await Promise.all([
        EmpresasGetAll({ force: true }),
        SedesGetAll({ force: true }),
        GaragesGetAll({ force: true }),
      ]);
      if (!mounted) return;
      setEmpresas(obtenerListado(empresasRes.datos));
      setSedes(obtenerListado(sedesRes.datos));
      setGarages(obtenerListado(garagesRes.datos));
      setCargandoOrigenes(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  const sedesFiltradas = useMemo(
    () => sedes.filter((s) => !idEmpresa || String(s.id_empresa || s.empresa_id) === String(idEmpresa)),
    [sedes, idEmpresa]
  );

  const garagesFiltrados = useMemo(
    () => garages.filter((g) => {
      if (idGarage) return true;
      if (!idSede) return true;
      return String(g.id_sede || g.sede_id) === String(idSede);
    }),
    [garages, idSede, idGarage]
  );

  const nombreGarage = garages.find((g) => String(g.id) === String(idGarage))?.nombre || "";

  const montoFinal = montoCustom !== "" ? Number(montoCustom) || 0 : monto;

  const generarOrderId = () => {
    setOrderId("TEST-" + Date.now());
    setPreferencia(null);
    setPagoVerificado(null);
    detenerPolling();
  };

  const detenerPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
    setPollingIntento(0);
    pollingOrderRef.current = "";
  };

  const iniciarPollingAutomatico = (orderIdParaPolling) => {
    const oid = String(orderIdParaPolling || "").trim();
    if (!oid) return;
    detenerPolling();
    pollingOrderRef.current = oid;
    setPolling(true);
    setPollingIntento(0);
    let intentos = 0;
    pollingRef.current = setInterval(async () => {
      intentos += 1;
      setPollingIntento(intentos);
      // máximo 3 min (36 intentos x 5s)
      if (intentos > 36) {
        detenerPolling();
        Swal.fire({ toast: true, position: "top-end", icon: "info", title: "Polling detenido: no se detectó pago en 3 min. Usa Buscar por Order ID manual.", showConfirmButton: false, timer: 4000 });
        return;
      }
      try {
        const res = await PagosBuscar({ external_reference: oid });
        const lista = res.datos?.results || res.datos?.pagos || [];
        const arr = Array.isArray(lista) ? lista : [];
        if (res.respuesta && arr.length > 0) {
          const candidato = arr[0];
          const pid = String(candidato.id || candidato.mp_payment_id || "").trim();
          if (!pid) return;
          // Verificación completa que además hace savePaymentRecord en backend y actualiza mp_payment_status
          const verif = await PagosGetById(pid);
          if (verif.respuesta) {
            detenerPolling();
            const pago = verif.datos?.payment || verif.datos;
            setPaymentIdVerificar(pid);
            setPagoVerificado(pago);
            onPagoVerificado?.(pago);
            Swal.fire({ toast: true, position: "top-end", icon: "success", title: `¡Pago detectado automáticamente! ${pid} (${pago.status})`, showConfirmButton: false, timer: 3500 });
          }
        }
      } catch {}
    }, 5000);
  };

  const crearPreferencia = async () => {
    if (!(montoFinal > 0)) {
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "Ingresá un monto válido", showConfirmButton: false, timer: 2500 });
      return;
    }
    if (!orderId.trim()) {
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "El orderId es obligatorio", showConfirmButton: false, timer: 2500 });
      return;
    }

    setCreandoPreferencia(true);
    setPagoVerificado(null);

    const items = [
      {
        id: idGarage || "garage-test",
        title: descripcion.trim() || (nombreGarage ? `Reserva en ${nombreGarage}` : "Reserva SmartLot"),
        unit_price: montoFinal,
        quantity: 1,
      },
    ];

    const res = await PagosCrearPreferencia(items, orderId.trim());
    setCreandoPreferencia(false);

    if (!res.respuesta) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: res.datos?.message || "No se pudo crear la preferencia", showConfirmButton: false, timer: 4000 });
      return;
    }

    setPreferencia(res.datos);
    // Crear preferencia NO genera paymentId. El payment_id llega en el redirect de Mercado Pago
    // o buscándolo por external_reference (orderId). Persistimos para el flujo de retorno.
    try {
      localStorage.setItem("mp_last_orderId", orderId.trim());
      localStorage.setItem("mp_last_preferenceId", String(res.datos.preferenceId || res.datos.preference_id || ""));
      sessionStorage.setItem("mp_pending_orderId", orderId.trim());
    } catch {}
    // Polling automático: cada 5s busca por external_reference y actualiza mp_payment_status sin webhook
    iniciarPollingAutomatico(orderId.trim());
  };

  const abrirCheckout = (esSandbox, enMismaPestana = false) => {
    const url = esSandbox ? preferencia.sandboxInitPoint || preferencia.sandbox_init_point : preferencia.initPoint || preferencia.init_point;
    if (!url) return;
    try {
      const oid = orderId.trim();
      const pid = String(preferencia.preferenceId || preferencia.preference_id || "");
      localStorage.setItem("mp_last_orderId", oid);
      localStorage.setItem("mp_last_preferenceId", pid);
      sessionStorage.setItem("mp_pending_orderId", oid);
      sessionStorage.setItem("mp_pending_preferenceId", pid);
    } catch {}
    if (enMismaPestana) {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const verificarPago = async () => {
    const id = (paymentIdVerificar || "").trim();
    if (!id) return;
    detenerPolling();

    // Validación amigable: permitir numérico o UUID, alertar si parece merchant_order
    if (id.includes(';') || (id.includes('T') && id.includes('UTC'))) {
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: `El valor "${id.slice(0, 30)}..." no es payment_id. Usa Buscar por Order ID.`, showConfirmButton: false, timer: 4000 });
      return;
    }

    setVerificando(true);
    const res = await PagosGetById(id, {
      external_reference: orderId.trim() || undefined,
      preference_id: preferencia?.preferenceId || preferencia?.preference_id || localStorage.getItem("mp_last_preferenceId") || undefined,
    });
    setVerificando(false);

    if (!res.respuesta) {
      const msg = res.datos?.message || res.datos?.error || "No se pudo verificar el pago";
      const code = res.datos?.code;
      // Si es 404 y tenemos orderId, ofrecer fallback automático por external_reference
      if ((res.status === 404 || code === 'payment_not_found') && orderId.trim()) {
        Swal.fire({ toast: true, position: "top-end", icon: "info", title: `${msg}. Buscando por Order ID ${orderId}...`, showConfirmButton: false, timer: 3000 });
        buscarPorOrderId();
        return;
      }
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: msg, showConfirmButton: false, timer: 4000 });
      setPagoVerificado(null);
      return;
    }

    const pago = res.datos?.payment || res.datos;
    setPagoVerificado(pago);
    onPagoVerificado?.(pago);
  };

  const buscarPorOrderId = async () => {
    const oid = (orderId || "").trim();
    if (!oid) {
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "Ingresá un Order ID válido", showConfirmButton: false, timer: 2500 });
      return;
    }
    detenerPolling();
    setBuscandoPorOrder(true);
    setPagoVerificado(null);
    const res = await PagosBuscar({ external_reference: oid });
    if (!res.respuesta) {
      setBuscandoPorOrder(false);
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: res.datos?.message || "No se pudo buscar por Order ID", showConfirmButton: false, timer: 4000 });
      return;
    }
    const lista = res.datos?.results || res.datos?.pagos || [];
    const pagosArray = Array.isArray(lista) ? lista : [];
    if (!pagosArray.length) {
      setBuscandoPorOrder(false);
      Swal.fire({ toast: true, position: "top-end", icon: "info", title: `No se encontró ningún pago para "${oid}"`, showConfirmButton: false, timer: 4000 });
      return;
    }
    // Tomar el más reciente (primer resultado ordenado por MP por fecha desc)
    const pagoEncontrado = pagosArray[0];
    const pid = String(pagoEncontrado.id || pagoEncontrado.mp_payment_id || "");
    if (!pid) {
      setBuscandoPorOrder(false);
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: "El pago encontrado no tiene ID válido", showConfirmButton: false, timer: 3000 });
      return;
    }
    setPaymentIdVerificar(pid);
    const verif = await PagosGetById(pid);
    setBuscandoPorOrder(false);
    if (!verif.respuesta) {
      Swal.fire({ toast: true, position: "top-end", icon: "error", title: verif.datos?.message || "No se pudo verificar el pago encontrado", showConfirmButton: false, timer: 4000 });
      return;
    }
    const pago = verif.datos?.payment || verif.datos;
    setPagoVerificado(pago);
    onPagoVerificado?.(pago);
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: `Pago ${pid} verificado`, showConfirmButton: false, timer: 2000 });
  };

  // Manejo de retorno desde Mercado Pago (back_url.success = /superadmin/pagos-test?payment_id=...&external_reference=...)
  useEffect(() => {
    const pid = searchParams.get("payment_id") || searchParams.get("paymentId") || searchParams.get("collection_id") || searchParams.get("collectionId");
    const ext = searchParams.get("external_reference") || searchParams.get("externalReference");
    const pref = searchParams.get("preference_id") || sessionStorage.getItem("mp_pending_preferenceId") || localStorage.getItem("mp_last_preferenceId");
    const statusHint = searchParams.get("status") || searchParams.get("collection_status");
    if (!pid && !ext) return;
    if (pid) {
      setPaymentIdVerificar(pid);
      if (ext) setOrderId(ext);
      detenerPolling();
      setVerificando(true);
      PagosGetById(String(pid).trim(), {
        external_reference: ext || undefined,
        preference_id: pref || undefined,
      }).then((res) => {
        setVerificando(false);
        if (res.respuesta) {
          const pago = res.datos?.payment || res.datos;
          setPagoVerificado(pago);
          onPagoVerificado?.(pago);
          Swal.fire({ toast: true, position: "top-end", icon: "success", title: `Retorno MP: pago ${pid} ${pago.status} ${statusHint ? `(${statusHint})` : ""}`, showConfirmButton: false, timer: 4000 });
          setSearchParams({}, { replace: true });
        } else if (ext) {
          PagosBuscar({ external_reference: ext }).then((r2) => {
            const lista = r2.datos?.results || r2.datos?.pagos || [];
            const arr = Array.isArray(lista) ? lista : [];
            if (r2.respuesta && arr.length) {
              const pid2 = String(arr[0].id || arr[0].mp_payment_id || "").trim();
              if (pid2) {
                setPaymentIdVerificar(pid2);
                PagosGetById(pid2).then((verif) => {
                  if (verif.respuesta) {
                    const pago2 = verif.datos?.payment || verif.datos;
                    setPagoVerificado(pago2);
                    Swal.fire({ toast: true, position: "top-end", icon: "success", title: `Pago por Order ID ${ext}: ${pid2}`, showConfirmButton: false, timer: 3500 });
                    setSearchParams({}, { replace: true });
                  }
                });
              }
            } else {
              Swal.fire({ toast: true, position: "top-end", icon: "info", title: res.datos?.message || "Pago no encontrado tras retorno", showConfirmButton: false, timer: 3000 });
            }
          });
        } else {
          Swal.fire({ toast: true, position: "top-end", icon: "error", title: res.datos?.message || "No se pudo verificar el pago del retorno", showConfirmButton: false, timer: 3500 });
        }
      });
      return;
    }
    if (ext) {
      setOrderId(ext);
      detenerPolling();
      setTimeout(() => buscarPorOrderId(), 200);
    }
  }, []); // solo al montar tras retorno MP

  return (
    <div className="mpt-scroll">
      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div>
            <h3>Configuración del pago</h3>
            <p>Seleccioná el contexto de la reserva (opcional) y el monto a cobrar.</p>
          </div>
        </div>

        {cargandoOrigenes ? (
          <div className="mpt-loading-row"><Loader2 className="mpt-spin" size={18} /> Cargando empresas, sedes y garages…</div>
        ) : (
          <div className="mpt-form-grid">
            <label className="mpt-field">
              <span><Building2 size={15} /> Empresa</span>
              <select value={idEmpresa} onChange={(e) => { setIdEmpresa(e.target.value); setIdSede(""); setIdGarage(""); }}>
                <option value="">— Sin empresa —</option>
                {empresas.map((empresa) => (
                  <option key={empresa.id} value={empresa.id}>
                    {empresa.nombre || empresa.razon_social || empresa.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="mpt-field">
              <span><MapPin size={15} /> Sede</span>
              <select value={idSede} onChange={(e) => { setIdSede(e.target.value); setIdGarage(""); }} disabled={!idEmpresa}>
                <option value="">— {idEmpresa ? "Todas las sedes" : "Elegí primero la empresa"} —</option>
                {sedesFiltradas.map((sede) => (
                  <option key={sede.id} value={sede.id}>{sede.nombre || sede.direccion || sede.id}</option>
                ))}
              </select>
            </label>

            <label className="mpt-field">
              <span><CreditCard size={15} /> Garage</span>
              <select value={idGarage} onChange={(e) => setIdGarage(e.target.value)} disabled={!idSede}>
                <option value="">— {idSede ? "Garages de la sede" : "Elegí primero la sede"} —</option>
                {garagesFiltrados.map((garage) => (
                  <option key={garage.id} value={garage.id}>{garage.nombre || garage.id}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="mpt-form-grid">
          <label className="mpt-field mpt-field--monto">
            <span><CircleDollarSign size={15} /> Monto (ARS)</span>
            <div className="mpt-monto-input">
              <input
                type="number"
                min="1"
                value={montoCustom}
                placeholder={String(monto)}
                onChange={(e) => setMontoCustom(e.target.value)}
              />
              <strong>{formatearImporte(montoFinal)}</strong>
            </div>
            <div className="mpt-precios-rapidos">
              {PRECIOS_RAPIDOS.map((precio) => (
                <button
                  key={precio}
                  type="button"
                  className={montoCustom === "" && monto === precio ? "mpt-precio mpt-precio--active" : "mpt-precio"}
                  onClick={() => { setMonto(precio); setMontoCustom(""); }}
                >
                  ${precio.toLocaleString("es-AR")}
                </button>
              ))}
            </div>
          </label>

          <label className="mpt-field">
            <span><FileText size={15} /> Descripción del ítem</span>
            <input
              type="text"
              value={descripcion}
              placeholder={`Reserva en ${nombreGarage || "SmartLot"}`}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>

          <label className="mpt-field">
            <span><Wallet size={15} /> Order ID (external_reference)</span>
            <div className="mpt-orderid">
              <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
              <button type="button" onClick={generarOrderId} title="Generar nuevo ID"><RefreshCw size={15} /></button>
            </div>
          </label>
        </div>
      </section>

      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div>
            <h3>Tarjetas de prueba</h3>
            <p>Usá estas tarjetas en el checkout de Mercado Pago (sandbox). Titular <strong>APRO</strong>, vencimiento futuro.</p>
          </div>
        </div>
        <div className="mpt-tarjetas">
          {TARJETAS_PRUEBA.map((tarjeta) => (
            <button
              key={tarjeta.id}
              type="button"
              className={`mpt-tarjeta-btn ${tarjetaSeleccionada === tarjeta.id ? "mpt-tarjeta-btn--active" : ""}`}
              onClick={() => setTarjetaSeleccionada(tarjeta.id)}
            >
              <TarjetaVisual tarjeta={tarjeta} activa={tarjetaSeleccionada === tarjeta.id} />
              <span>{tarjeta.marca}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div>
            <h3>Crear preferencia</h3>
            <p>Se crea en el backend, guarda el registro en la BD y te devuelve los puntos de inicio del Checkout Pro.</p>
          </div>
          <button
            type="button"
            className="mpt-btn mpt-btn--primary"
            onClick={crearPreferencia}
            disabled={creandoPreferencia}
          >
            {creandoPreferencia ? <Loader2 className="mpt-spin" size={17} /> : <Wallet size={17} />}
            {creandoPreferencia ? "Creando preferencia…" : "Crear preferencia"}
          </button>
        </div>

        {preferencia ? (
          <div className="mpt-preferencia">
            <div className="mpt-preferencia__meta">
              <span>Preference ID: <code>{preferencia.preferenceId || preferencia.preference_id}</code></span>
              <button type="button" className="mpt-copy" onClick={() => copiar(preferencia.preferenceId || preferencia.preference_id)}>
                <ClipboardCopy size={14} /> Copiar
              </button>
            </div>

            <div className="mpt-preferencia__actions">
              <button type="button" className="mpt-btn mpt-btn--checkout" onClick={() => abrirCheckout(true, false)}>
                <ExternalLink size={17} /> Abrir Checkout Pro (sandbox)
              </button>
              <button type="button" className="mpt-btn mpt-btn--ghost" onClick={() => abrirCheckout(false, false)} disabled={!(preferencia.initPoint || preferencia.init_point)}>
                <ArrowUpRight size={17} /> init_point
              </button>
              <button type="button" className="mpt-btn mpt-btn--ghost" onClick={() => abrirCheckout(true, true)} title="Abre en la misma pestaña: recomendado si quieres volver automáticamente a /payment/success">
                <ArrowUpRight size={15} /> Abrir en misma pestaña
              </button>
              {preferencia.sandboxInitPoint || preferencia.sandbox_init_point ? (
                <button type="button" className="mpt-copy" onClick={() => copiar(preferencia.sandboxInitPoint || preferencia.sandbox_init_point, "Link sandbox copiado")}>
                  <ClipboardCopy size={14} /> Copiar link sandbox
                </button>
              ) : null}
            </div>

            <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 10, background: "#EFF6FF", border: "1px solid #DBEAFE", color: "#1E3A8A", fontSize: 13, lineHeight: 1.5 }}>
              <strong style={{ display: "flex", alignItems: "center", gap: 6 }}><BadgeCheck size={16} /> Después de pagar</strong>
              En <code>localhost</code> Mercado Pago <strong>no permite</strong> <code>auto_return</code> con <code>http</code> (exige <code>https</code> público + Checkout Pro). Por eso aunque tengas <code>MP_AUTO_RETURN=approved</code> el backend lo omite aquí y debes hacer clic en <strong>“Volver al sitio”</strong> en el comprobante para volver a <code>/superadmin/pagos-test?payment_id=XXX</code> donde se verifica solo. Mientras tanto esta página <strong>busca automáticamente cada 5s</strong> por tu Order ID <code>{orderId}</code> y actualiza <code>mp_payment_status</code> en la BD (sin webhook).
              <div style={{ marginTop: 6, fontSize: 12, color: "#1E40AF" }}>Tip: para probar <code>auto_return</code> real usa <code>ngrok http 5173</code> y pon <code>FRONTEND_URL=https://xxxx.ngrok-free.app</code> en el backend.</div>
            </div>

            {polling && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: 13 }}>
                <Loader2 className="mpt-spin" size={16} />
                <span>Polling automático activo – buscando pago para <code>{pollingOrderRef.current}</code>… intento {pollingIntento}/36 (3 min)</span>
                <button type="button" onClick={detenerPolling} className="mpt-copy" style={{ marginLeft: "auto", background: "#fff" }}><X size={12} /> Detener</button>
              </div>
            )}

            <details className="mpt-raw">
              <summary>Ver respuesta cruda de la API</summary>
              <pre>{JSON.stringify(preferencia, null, 2)}</pre>
            </details>
          </div>
        ) : null}
      </section>

      <section className="mpt-card mpt-card--full">
        <div className="mpt-section-heading">
          <div>
            <h3>Verificar pago</h3>
            <p>Después de pagar, pegá el <code>payment_id</code> o usa tu <code>Order ID</code> para encontrar el pago (funciona sin webhook).</p>
          </div>
        </div>
        <div className="mpt-verificar">
          <input
            type="text"
            value={paymentIdVerificar}
            onChange={(e) => setPaymentIdVerificar(e.target.value)}
            placeholder="payment_id (ej: 123456789)"
          />
          <button type="button" className="mpt-btn mpt-btn--primary" onClick={verificarPago} disabled={verificando || !paymentIdVerificar.trim()}>
            {verificando ? <Loader2 className="mpt-spin" size={17} /> : <Search size={17} />}
            {verificando ? "Verificando…" : "Verificar estado"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="mpt-btn mpt-btn--ghost" onClick={buscarPorOrderId} disabled={buscandoPorOrder || !orderId.trim()}>
            {buscandoPorOrder ? <Loader2 className="mpt-spin" size={17} /> : <Search size={17} />}
            {buscandoPorOrder ? "Buscando…" : `Buscar pago por Order ID (${orderId})`}
          </button>
          <span style={{ fontSize: 12.5, color: "#64748B" }}>Busca en Mercado Pago por <code>external_reference</code> y verifica automáticamente el primer resultado.</span>
        </div>

        {pagoVerificado ? (
          <div className={`mpt-resultado mpt-resultado--${estadoClase(pagoVerificado.status)}`}>
            <div className="mpt-resultado__icon">
              {pagoVerificado.status === "approved" ? <CheckCircle2 size={26} /> : pagoVerificado.status === "rejected" ? <XCircle size={26} /> : <Wallet size={26} />}
            </div>
            <div className="mpt-resultado__info">
              <div>
                <EstadoBadge estado={pagoVerificado.status} />
                <span className="mpt-resultado__detail">{pagoVerificado.statusDetail || ""}</span>
              </div>
              <dl>
                <div><dt>ID</dt><dd>{pagoVerificado.id}</dd></div>
                <div><dt>Monto</dt><dd>{formatearImporte(pagoVerificado.transactionAmount || pagoVerificado.transaction_amount)}</dd></div>
                <div><dt>Método</dt><dd>{pagoVerificado.paymentType || pagoVerificado.payment_type_id || "—"}</dd></div>
                <div><dt>Aprobado</dt><dd>{formatearFecha(pagoVerificado.dateApproved || pagoVerificado.date_approved)}</dd></div>
                <div><dt>Referencia</dt><dd>{pagoVerificado.externalReference || pagoVerificado.external_reference || "—"}</dd></div>
                <div><dt>Preferencia</dt><dd>{pagoVerificado.preferenceId || pagoVerificado.preference_id || "—"}</dd></div>
              </dl>
            </div>
            <button type="button" className="mpt-icon-btn" onClick={() => setPagoVerificado(null)} aria-label="Cerrar resultado"><X size={17} /></button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
