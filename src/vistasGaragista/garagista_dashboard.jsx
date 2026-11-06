import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Warehouse } from "lucide-react";
import { GaragesGetAll, GaragesGetById } from "../servicies/API_Garage";
import { ReservasCheckIn, ReservasCheckOut, ReservasGetControlAcceso } from "../servicies/API_Reserva";
import { UsuariosGetById } from "../servicies/API_Usuario";
import EmptyState from "../componentesCompartidos/EmptyState";
import LectorQrReserva from "./LectorQrReserva";
import HeaderAdmin from "../componentesAdmin/header_admin";
import FooterAdmin from "../componentesAdmin/footer_admin";
import GaragistaEncabezado from "../componentesGaragista/garagista_encabezado";
import GaragistaPaneles from "../componentesGaragista/garagista_paneles";
import GaragistaMovimientos from "../componentesGaragista/garagista_movimientos";
import GaragistaDashboardSkeleton from "../componentesGaragista/garagista_dashboard_skeleton";
import ModalVerificacionAcceso from "../componentesGaragista/modal_verificacion_acceso";
import {
  esValorVerdadero,
  normalizarReservaControlAcceso,
  obtenerFechaActual,
  obtenerFechaISOActual,
  obtenerHoraActual,
  obtenerHoraEntradaReal,
  obtenerHoraHabilitacionIngreso,
  obtenerHoraSalidaReal,
  obtenerIdGarage,
  obtenerIdReserva,
  obtenerListado,
  obtenerMensajeIngresoAnticipado,
  obtenerReservaResultadoQr,
} from "../componentesGaragista/control_acceso_helpers";
import { useAuth } from "../contexts/useAuth";
import { showToast } from "../helpers/toast";
import { normalizarPatente } from "../helpers/patente";
import { getUsuarioGarageIds } from "../helpers/usuarios";
import {
  aplanarReservaControlAcceso,
  obtenerReservasControlAcceso,
  reservaPerteneceAlGarage,
} from "../helpers/controlAcceso";
import "./garagista_dashboard.css";

export default function GaragistaDashboard() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [reservas, setReservas] = useState([]);
  const [garageData, setGarageData] = useState(null);
  const [garagesDisponibles, setGaragesDisponibles] = useState([]);
  const [garageSeleccionadoId, setGarageSeleccionadoId] = useState(null);
  const [garageGaragistaId, setGarageGaragistaId] = useState(null);
  const [asignacionConsultada, setAsignacionConsultada] = useState(false);
  const [cargandoGaragesAdmin, setCargandoGaragesAdmin] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seccionMovil, setSeccionMovil] = useState("pendientes");
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);
  const [tipoVerificacion, setTipoVerificacion] = useState("ingreso");
  const [patenteIngresada, setPatenteIngresada] = useState("");
  const [errorVerificacion, setErrorVerificacion] = useState("");
  const [patenteVerificada, setPatenteVerificada] = useState(false);
  const [guardandoAccion, setGuardandoAccion] = useState(false);
  const [lectorQrAbierto, setLectorQrAbierto] = useState(null);
  const [recargaReservas, setRecargaReservas] = useState(0);

  const esAdmin = Number(usuario?.id_rol) === 1;
  const idUsuarioSesion = Number(usuario?.id ?? usuario?.id_usuario ?? usuario?._id) || null;
  const idGarageSesion = useMemo(() => {
    const idNormalizado = getUsuarioGarageIds(usuario)[0];
    if (idNormalizado) return idNormalizado;
    const idAlternativo = Number(usuario?.idGarage ?? usuario?.garage_id ?? usuario?.garageId);
    return Number.isInteger(idAlternativo) && idAlternativo > 0 ? idAlternativo : null;
  }, [usuario]);
  const [fechaISOActual, setFechaISOActual] = useState(obtenerFechaISOActual);
  const fechaActual = obtenerFechaActual();
  const idGarageAsignado = useMemo(
    () => esAdmin ? garageSeleccionadoId : garageGaragistaId ?? idGarageSesion,
    [esAdmin, garageGaragistaId, garageSeleccionadoId, idGarageSesion]
  );
  const terminoBusqueda = busqueda.trim().toLowerCase();
  const capacidadTotal = useMemo(() => {
    if (!garageData) return 0;
    return Number(garageData.capacidad_reservas || 0) + Number(garageData.capacidad_para_no_reservas || 0);
  }, [garageData]);
  const cargandoVista = idGarageAsignado
    ? cargando
    : esAdmin ? cargandoGaragesAdmin : Boolean(idUsuarioSesion) && !asignacionConsultada;
  const errorVista = idGarageAsignado
    ? errorCarga
    : esAdmin
      ? cargandoGaragesAdmin ? "" : "No hay garages disponibles para consultar."
      : "No tenés un garage asignado.";

  useEffect(() => {
    const actualizarFecha = () => setFechaISOActual(obtenerFechaISOActual());
    const intervalo = window.setInterval(actualizarFecha, 60 * 1000);
    window.addEventListener("focus", actualizarFecha);
    document.addEventListener("visibilitychange", actualizarFecha);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener("focus", actualizarFecha);
      document.removeEventListener("visibilitychange", actualizarFecha);
    };
  }, []);

  useEffect(() => {
    if (esAdmin) return;

    let cancelado = false;
    if (!idUsuarioSesion) return;

    UsuariosGetById(idUsuarioSesion, { force: true })
      .then((respuesta) => {
        if (cancelado || !respuesta.respuesta) return;

        const payload = respuesta.datos;
        const candidatos = [
          ...(Array.isArray(payload) ? payload : []),
          payload,
          payload?.usuario,
          payload?.data,
          payload?.datos,
        ].filter((item) => item && typeof item === "object" && !Array.isArray(item));
        const ids = candidatos.flatMap(getUsuarioGarageIds);
        const idActual = ids[0] ?? idGarageSesion;
        setGarageGaragistaId(Number(idActual) || null);
      })
      .finally(() => {
        if (!cancelado) setAsignacionConsultada(true);
      });

    return () => { cancelado = true; };
  }, [esAdmin, idGarageSesion, idUsuarioSesion]);

  useEffect(() => {
    if (!esAdmin) return;

    let cancelado = false;

    const cargarGaragesDelAdmin = async () => {
      setCargandoGaragesAdmin(true);
      try {
        const garagesResp = await GaragesGetAll();
        if (cancelado) return;

        // El backend limita el listado por usuario_garage o por tratos de la sede/empresa.
        const garagesPermitidos = obtenerListado(garagesResp.datos);

        setGaragesDisponibles(garagesPermitidos);
        setGarageSeleccionadoId((actual) => {
          const seleccionValida = actual && garagesPermitidos.some(
            (garage) => Number(obtenerIdGarage(garage)) === actual
          );
          return seleccionValida ? actual : Number(obtenerIdGarage(garagesPermitidos[0])) || null;
        });
      } catch {
        if (!cancelado) {
          setGaragesDisponibles([]);
          setGarageSeleccionadoId(null);
        }
      } finally {
        if (!cancelado) setCargandoGaragesAdmin(false);
      }
    };

    cargarGaragesDelAdmin();
    return () => { cancelado = true; };
  }, [esAdmin, usuario?.id_empresa, usuario?.id_sede]);

  useEffect(() => {
    if (!idGarageAsignado) return;

    let cancelado = false;

    const cargarDatos = async () => {
      if (recargaReservas === 0) setCargando(true);
      setErrorCarga("");

      try {
        const [garageResp, reservasResp] = await Promise.all([
          GaragesGetById(idGarageAsignado),
          ReservasGetControlAcceso(idGarageAsignado, fechaISOActual, { force: true }),
        ]);

        if (cancelado) return;

        const garageRaw = garageResp.respuesta ? garageResp.datos : null;
        const garageCandidates = [garageRaw];
        if (garageRaw?.data) garageCandidates.push(garageRaw.data);
        if (garageRaw?.garage) garageCandidates.push(garageRaw.garage);
        if (Array.isArray(garageRaw)) garageCandidates.push(garageRaw[0]);
        const garage = garageCandidates.find((g) => g && typeof g === "object" && !Array.isArray(g)) || null;

        setGarageData(garage);

        if (!reservasResp.respuesta) {
          throw new Error(
            reservasResp.datos?.message || "No se pudieron obtener las reservas del garage."
          );
        }

        const todasReservas = obtenerReservasControlAcceso(reservasResp.datos)
          .map(aplanarReservaControlAcceso);

        const reservasDelGarage = todasReservas
          .filter((r) => {
            if (esValorVerdadero(r.borrado)) return false;
            return reservaPerteneceAlGarage(r, idGarageAsignado);
          })
          .map(normalizarReservaControlAcceso);

        if (!cancelado) setReservas(reservasDelGarage);
      } catch (error) {
        if (!cancelado) {
          setErrorCarga(error.message || "No se pudieron cargar las reservas del garage.");
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarDatos();
    return () => { cancelado = true; };
  }, [fechaISOActual, idGarageAsignado, recargaReservas]);

  const reservasFiltradas = useMemo(() => {
    return reservas.filter((reserva) => {
      // Un auto que ya ingresó debe permanecer visible aunque el backend
      // devuelva la fecha de ingreso en lugar de la fecha programada.
      if (reserva.fechaReserva !== fechaISOActual && reserva.estado !== "Dentro") return false;
      if (!terminoBusqueda) return true;

      const textoVisible = `${reserva.conductor} ${reserva.vehiculo}`.toLowerCase();
      return textoVisible.includes(terminoBusqueda);
    });
  }, [fechaISOActual, reservas, terminoBusqueda]);

  const reservasPendientes = reservasFiltradas.filter(
    (reserva) => reserva.estado === "Pendiente"
  );
  const autosDentro = reservasFiltradas.filter((reserva) => {
    if (reserva.estado !== "Dentro") return false;
    if (!terminoBusqueda) return true;
    return `${reserva.conductor} ${reserva.vehiculo}`.toLowerCase().includes(terminoBusqueda);
  });
  const movimientosFinalizados = reservasFiltradas.filter(
    (reserva) => reserva.estado === "Finalizado" || reserva.estado === "Sin registro"
  );
  const cantidadAutosDentro = reservasFiltradas.filter((reserva) => reserva.estado === "Dentro").length;

  const abrirVerificacion = (reserva) => {
    if (esAdmin) return;
    setReservaSeleccionada(reserva);
    setTipoVerificacion("ingreso");
    setPatenteIngresada("");
    setErrorVerificacion("");
    setPatenteVerificada(false);
  };

  const abrirVerificacionSalida = (reserva) => {
    if (esAdmin || guardandoAccion) return;
    setReservaSeleccionada(reserva);
    setTipoVerificacion("salida");
    setPatenteIngresada("");
    setErrorVerificacion("");
    setPatenteVerificada(false);
  };

  const cerrarVerificacion = () => {
    setReservaSeleccionada(null);
    setPatenteIngresada("");
    setErrorVerificacion("");
    setPatenteVerificada(false);
  };

  const verificarPatente = (event) => {
    event.preventDefault();
    if (esAdmin || !reservaSeleccionada) return;

    const patenteEscrita = normalizarPatente(patenteIngresada);
    if (!patenteEscrita) {
      setErrorVerificacion("Ingresá la patente completa para continuar.");
      return;
    }

    const patenteEsperada = normalizarPatente(reservaSeleccionada.patenteInterna);

    if (patenteEscrita !== patenteEsperada) {
      setErrorVerificacion(
        tipoVerificacion === "salida"
          ? "La patente ingresada no coincide con el vehículo registrado"
          : "La patente ingresada no coincide con la reserva."
      );
      return;
    }

    setErrorVerificacion("");
    setPatenteVerificada(true);
  };

  const confirmarAcceso = async () => {
    if (esAdmin || guardandoAccion || !reservaSeleccionada || !patenteVerificada) return;

    const horaHabilitacionIngreso = obtenerHoraHabilitacionIngreso(reservaSeleccionada);
    if (horaHabilitacionIngreso && new Date() < horaHabilitacionIngreso) {
      setErrorVerificacion(obtenerMensajeIngresoAnticipado(reservaSeleccionada));
      return;
    }

    setGuardandoAccion(true);
    const horaEntrada = obtenerHoraActual();
    const resultado = await ReservasCheckIn(reservaSeleccionada.id, patenteIngresada);

    if (resultado.respuesta) {
      setReservas((reservasActuales) =>
        reservasActuales.map((reserva) =>
          reserva.id === reservaSeleccionada.id
            ? {
                ...reserva,
                estado: "Dentro",
                horaEntrada,
                raw: { ...reserva.raw, ...resultado.datos },
              }
            : reserva
        )
      );
      cerrarVerificacion();
      showToast("Ingreso verificado correctamente.", "success");
    } else {
      const mensajeBackend = resultado.datos?.message || "";
      const ingresoTodaviaNoHabilitado = /todav[ií]a no est[aá] habilitad/i.test(mensajeBackend);
      setErrorVerificacion(
        ingresoTodaviaNoHabilitado
          ? obtenerMensajeIngresoAnticipado(reservaSeleccionada)
          : mensajeBackend || "No se pudo registrar el ingreso en el servidor."
      );
    }
    setGuardandoAccion(false);
  };

  const confirmarSalida = async () => {
    if (esAdmin || guardandoAccion || !reservaSeleccionada || !patenteVerificada) return;

    setGuardandoAccion(true);
    setErrorVerificacion("");
    const resultado = await ReservasCheckOut(reservaSeleccionada.id, patenteIngresada);

    if (resultado.respuesta) {
      const datosSalida = resultado.datos?.data ?? resultado.datos?.reserva ?? resultado.datos;
      const horaSalidaBackend = obtenerHoraSalidaReal(datosSalida || {});
      const horaSalida = horaSalidaBackend || obtenerHoraActual();

      setReservas((reservasActuales) =>
        reservasActuales.map((reserva) =>
          reserva.id === reservaSeleccionada.id
            ? {
                ...reserva,
                estado: "Finalizado",
                horaSalida,
                raw: { ...reserva.raw, ...datosSalida },
              }
            : reserva
        )
      );
      cerrarVerificacion();
      showToast("Salida registrada correctamente.", "success");
    } else {
      setErrorVerificacion(
        resultado.datos?.message || "No se pudo registrar la salida en el servidor. Intentá nuevamente."
      );
    }

    setGuardandoAccion(false);
  };

  return (
    <>
      <HeaderAdmin homePath={esAdmin ? "/admin_dashboard" : "/garagista_dashboard"} />

      <main className="garagista-page">
        <div className="garagista-shell">
          <GaragistaEncabezado
            esAdmin={esAdmin}
            onVolverAdmin={() => navigate("/admin_dashboard")}
            garageSeleccionadoId={garageSeleccionadoId}
            onGarageChange={setGarageSeleccionadoId}
            cargandoGaragesAdmin={cargandoGaragesAdmin}
            garagesDisponibles={garagesDisponibles}
            cargandoVista={cargandoVista}
            garageData={garageData}
            fechaActual={fechaActual}
            cantidadAutosDentro={cantidadAutosDentro}
            capacidadTotal={capacidadTotal}
            busqueda={busqueda}
            onBusquedaChange={setBusqueda}
          />

          {cargandoVista ? (
            <GaragistaDashboardSkeleton />
          ) : errorVista ? (
            errorCarga ? (
              <div className="garagista-empty" role="alert">{errorVista}</div>
            ) : (
              <EmptyState
                icon={Warehouse}
                title={errorVista}
                description={esAdmin
                  ? "Creá un garage o asigná uno a tu cuenta para ver el control de acceso."
                  : "Contactá al superadmin para que te asigne un garage."}
                action={esAdmin ? { label: "Gestionar garages", to: "/gestion_garages" } : undefined}
              />
            )
          ) : (
            <>
              <GaragistaPaneles
                esAdmin={esAdmin}
                seccionMovil={seccionMovil}
                onSeccionChange={setSeccionMovil}
                reservasPendientes={reservasPendientes}
                autosDentro={autosDentro}
                guardandoAccion={guardandoAccion}
                terminoBusqueda={terminoBusqueda}
                onEscanearIngreso={() => setLectorQrAbierto("ingreso")}
                onEscanearSalida={() => setLectorQrAbierto("salida")}
                abrirVerificacion={abrirVerificacion}
                abrirVerificacionSalida={abrirVerificacionSalida}
                onLimpiarFiltro={() => setBusqueda("")}
              />
              <GaragistaMovimientos movimientosFinalizados={movimientosFinalizados} />
            </>
          )}
        </div>
      </main>

      {esAdmin ? <FooterAdmin /> : null}

      {!esAdmin && reservaSeleccionada ? (
        <ModalVerificacionAcceso
          reserva={reservaSeleccionada}
          tipoVerificacion={tipoVerificacion}
          patenteIngresada={patenteIngresada}
          errorVerificacion={errorVerificacion}
          patenteVerificada={patenteVerificada}
          guardandoAccion={guardandoAccion}
          onClose={cerrarVerificacion}
          onSubmit={verificarPatente}
          onPatenteChange={(value) => {
            setPatenteIngresada(value);
            setErrorVerificacion("");
          }}
          onConfirmar={tipoVerificacion === "salida" ? confirmarSalida : confirmarAcceso}
        />
      ) : null}
      {lectorQrAbierto && !esAdmin ? (
        <LectorQrReserva
          tipo={lectorQrAbierto}
          onClose={() => setLectorQrAbierto(null)}
          onIngresoExitoso={(datosIngreso) => {
            const reservaIngresada = obtenerReservaResultadoQr(datosIngreso);
            const idReservaIngresada = obtenerIdReserva(reservaIngresada);
            if (idReservaIngresada) {
              setReservas((actuales) => actuales.map((reserva) =>
                Number(reserva.id) === Number(idReservaIngresada)
                  ? {
                      ...reserva,
                      estado: "Dentro",
                      horaEntrada: obtenerHoraEntradaReal(reservaIngresada) || obtenerHoraActual(),
                      raw: { ...reserva.raw, ...reservaIngresada },
                    }
                  : reserva
              ));
            }
            setLectorQrAbierto(null);
            setRecargaReservas((actual) => actual + 1);
          }}
          onSalidaExitosa={(datosSalida) => {
            const reservaFinalizada = obtenerReservaResultadoQr(datosSalida);
            const idReservaFinalizada = obtenerIdReserva(reservaFinalizada);
            if (idReservaFinalizada) {
              setReservas((actuales) => actuales.map((reserva) =>
                Number(reserva.id) === Number(idReservaFinalizada)
                  ? {
                      ...reserva,
                      estado: "Finalizado",
                      horaSalida: obtenerHoraSalidaReal(reservaFinalizada) || obtenerHoraActual(),
                      raw: { ...reserva.raw, ...reservaFinalizada },
                    }
                  : reserva
              ));
            }
            setLectorQrAbierto(null);
            setRecargaReservas((actual) => actual + 1);
          }}
        />
      ) : null}
    </>
  );
}
