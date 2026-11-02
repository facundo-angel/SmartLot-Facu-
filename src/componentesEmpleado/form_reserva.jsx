import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Calendar, Car, Clock, Loader, MapPin, Plus, Warehouse, WalletCards } from "lucide-react";
import "./form_reserva.css";
import { getDiaDesdeFecha, getDiaDisplay } from "../helpers/diasSemana";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";
import FieldValidation from "../components/FieldValidation";
import { GaragesGetDistanciaSede } from "../servicies/API_Garage";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useAuth } from "../contexts/useAuth";
import { useGoogleMaps } from "../contexts/useGoogleMaps";
import EmptyState from "../componentesCompartidos/EmptyState";

const obtenerIdVehiculo = (vehiculo) => vehiculo?.id ?? vehiculo?.id_vehiculo ?? vehiculo?._id;
const obtenerIdGarage = (garage) => garage?.id_garage ?? garage?.idGarage ?? garage?.id ?? garage?._id;

const obtenerEtiquetaVehiculo = (vehiculo) => {
  const marca = vehiculo?.marca?.nombre ?? vehiculo?.marca_nombre ?? vehiculo?.marca;
  const modelo = vehiculo?.modelo?.nombre ?? vehiculo?.modelo_nombre ?? vehiculo?.modelo;
  const patente = vehiculo?.patente ?? vehiculo?.placa ?? vehiculo?.matricula;
  const nombre = [marca, modelo].filter(Boolean).join(" ").trim() || "Vehiculo";
  return patente ? `${nombre} (${patente})` : nombre;
};

const obtenerEtiquetaGarage = (garage) => {
  const nombre = garage?.nombre || garage?.name || garage?.descripcion || garage?.ubicacion || garage?.nombre_garage || garage?.garage_nombre || garage?.nombre_zona || garage?.direccion;
  return nombre || "Garage";
};

const obtenerFechaLocalHoy = () => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const FormularioReserva = forwardRef(function FormularioReserva({
  onSubmit,
  onSelectionChange,
  loading,
  vehiculos = [],
  garages = [],
  initialData,
  obtenerDisponibilidad,
}, ref) {
  const { usuario } = useAuth();
  const preferences = (() => {
    try {
      return JSON.parse(localStorage.getItem("smartlot_empleado_config")) || {};
    } catch {
      return {};
    }
  })();
  const [error, setError] = useState("");
  const [distanciaInfo, setDistanciaInfo] = useState(null);
  const [loadingDistancia, setLoadingDistancia] = useState(false);
  const [distanciaError, setDistanciaError] = useState("");

  const { isLoaded: mapsLoaded, loadError: mapsLoadError } = useGoogleMaps();
  if (mapsLoadError) console.warn('form_reserva: Google Maps no cargó:', mapsLoadError);

  const [formData, setFormData] = useState({
    fecha: "",
    horaInicio: initialData?.horaInicio || preferences.horaInicio || "",
    horaFin: initialData?.horaFin || preferences.horaFin || "",
    idGarage: initialData?.idGarage
      ? String(initialData.idGarage)
      : "",
    idVehiculo: initialData?.idVehiculo
      ? String(initialData.idVehiculo)
      : (preferences.vehiculoPredeterminado || ""),
    dia: "",
  });

  const getSchema = () => ({
    fecha: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
      { rule: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v), message: "Formato YYYY-MM-DD" },
    ],
    horaInicio: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
    ],
    horaFin: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
      () => ({ rule: () => !formData.horaInicio || !formData.horaFin || formData.horaInicio < formData.horaFin, message: "Debe ser posterior a inicio" }),
    ],
    idGarage: [
      { rule: (v) => v !== "", message: "Selecciona un garage" },
    ],
    idVehiculo: [
      { rule: (v) => v !== "", message: "Selecciona un vehículo" },
    ],
  });

  const { isValid, touched, touch } = useLiveValidation(formData, getSchema());
  const datosCompletos = isValid && vehiculos.length > 0 && garages.length > 0;
  const garageElegido = formData.idGarage !== "";
  const garageSeleccionadoObj = garages.find(
    (garage) => String(obtenerIdGarage(garage)) === String(formData.idGarage)
  );
  const disponibilidadPreview = garageElegido
    ? obtenerDisponibilidad?.(garageSeleccionadoObj)
    : null;
  const precioFormateado = disponibilidadPreview
    ? new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }).format(disponibilidadPreview.precio)
    : "";
  const requierePago = garageElegido
    && disponibilidadPreview?.hay_cupo_corporativo === false
    && disponibilidadPreview?.hay_cupo_pago === true;
  const sinDisponibilidad = garageElegido
    && disponibilidadPreview?.hay_cupo_corporativo === false
    && disponibilidadPreview?.hay_cupo_pago === false;

  const ubicacionGarageActual = garageSeleccionadoObj?.ubicacion || 
                                garageSeleccionadoObj?.direccion || 
                                garageSeleccionadoObj?.nombre_zona || 
                                garageSeleccionadoObj?.descripcion;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    onSelectionChange?.();
  };

  useImperativeHandle(ref, () => ({
    limpiarGarage() {
      setFormData((prev) => ({ ...prev, idGarage: "" }));
      setDistanciaInfo(null);
      setDistanciaError("");
    },
  }), []);

  useEffect(() => {
    const diaApi = getDiaDesdeFecha(formData.fecha);
    setFormData((prev) => {
      if (prev.dia === diaApi) return prev;
      return { ...prev, dia: diaApi };
    });
  }, [formData.fecha]);

  useEffect(() => {
    if (!formData.idGarage) {
      setDistanciaInfo(null);
      setDistanciaError("");
      return;
    }

    let cancel = false;
    const fetchDistancia = async () => {
      setLoadingDistancia(true);
      setDistanciaError("");
      setDistanciaInfo(null);

      const result = await GaragesGetDistanciaSede(Number(formData.idGarage), Number(usuario?.id_sede));
      if (cancel) return;

      setLoadingDistancia(false);

      if (result.respuesta) {
        setDistanciaInfo(result.datos);
      } else {
        const errorData = result.datos;
        if (import.meta.env.DEV) {
          console.warn("Error distancia-sede:", errorData);
        }
        const fallbackMsg = "No se pudo calcular la distancia.";
        if (!errorData) {
          setDistanciaError(fallbackMsg);
          return;
        }
        const msg = errorData?.message || errorData?.error || fallbackMsg;
        setDistanciaError(msg);
      }
    };

    fetchDistancia();

    return () => { cancel = true; };
  }, [formData.idGarage, usuario?.id_sede]);

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!isValid) {
      setError("Corrige los errores antes de confirmar.");
      return;
    }

    setError("");
    // Offset explicito -03:00: el servidor puede correr en UTC (Render) y sin
    // offset interpretaria la hora local AR como UTC, corrida 3 horas.
    const fechaEntrada = `${formData.fecha}T${formData.horaInicio}:00-03:00`;
    const fechaSalida = `${formData.fecha}T${formData.horaFin}:00-03:00`;
    const garageSeleccionado = garages.find(
      (garage) => Number(obtenerIdGarage(garage)) === Number(formData.idGarage)
    );
    const vehiculoSeleccionado = vehiculos.find(
      (vehiculo) => Number(obtenerIdVehiculo(vehiculo)) === Number(formData.idVehiculo)
    );

    onSubmit({
      fecha_entrada: fechaEntrada,
      fecha_salida: fechaSalida,
      idGarage: parseInt(formData.idGarage, 10),
      id_garage: parseInt(formData.idGarage, 10),
      idVehiculo: parseInt(formData.idVehiculo, 10),
      id_vehiculo: parseInt(formData.idVehiculo, 10),
      dia: formData.dia,
      _metaData: {
        fecha: formData.fecha,
        horaInicio: formData.horaInicio,
        horaFin: formData.horaFin,
        ubicacion: obtenerEtiquetaGarage(garageSeleccionado),
        vehiculo: obtenerEtiquetaVehiculo(vehiculoSeleccionado),
      },
    });
  };

  return (
    <div className="reserva-container-wrapper">
      <form onSubmit={handleFormSubmit} className="reserva-form-card">
        <div className="form-field-group">
          <label className="form-field-label" htmlFor="fecha">Fecha de reserva</label>
          <div className="form-input-icon-wrapper">
            <Calendar className="form-input-icon" size={18} />
            <input
              id="fecha"
              name="fecha"
              type="date"
              className="form-text-input"
              value={formData.fecha}
              min={obtenerFechaLocalHoy()}
              onChange={handleChange}
              required
              autoComplete="off"
            />
            </div>
            <FieldValidation conditions={buildConditions(getSchema(), "fecha", formData)} isTouched={touched.fecha} />
          </div>

        <div className="form-time-fields-row">
          <div className="form-field-group">
            <label className="form-field-label" htmlFor="horaInicio">Hora Inicio</label>
            <div className="form-input-icon-wrapper">
              <Clock className="form-input-icon" size={18} />
              <input
                id="horaInicio"
                name="horaInicio"
                type="time"
                className="form-text-input"
                value={formData.horaInicio}
                onChange={(e) => { handleChange(e); touch("horaInicio"); }}
                required
                autoComplete="off"
              />
            </div>
            <FieldValidation conditions={buildConditions(getSchema(), "horaInicio", formData)} isTouched={touched.horaInicio} />
          </div>

          <div className="form-field-group">
            <label className="form-field-label" htmlFor="horaFin">Hora Fin</label>
            <div className="form-input-icon-wrapper">
              <Clock className="form-input-icon" size={18} />
              <input
                id="horaFin"
                name="horaFin"
                type="time"
                className="form-text-input"
                value={formData.horaFin}
                onChange={(e) => { handleChange(e); touch("horaFin"); }}
                required
                autoComplete="off"
              />
            </div>
            <FieldValidation conditions={buildConditions(getSchema(), "horaFin", formData)} isTouched={touched.horaFin} />
          </div>
        </div>

        {formData.dia && (
          <div className="dia-indicador-reserva">
            <span className="dia-indicador-label">Día de la reserva</span>
            <span className="dia-indicador-valor">{getDiaDisplay(formData.dia)}</span>
          </div>
        )}

        <div className="form-field-group">
          <label className="form-field-label" htmlFor="idGarage">Garage</label>
          <div className="form-input-icon-wrapper">
            <Warehouse className="form-input-icon" size={18} />
            <select
              id="idGarage"
              name="idGarage"
              className="form-dropdown-select"
              value={formData.idGarage}
              onChange={(e) => { handleChange(e); touch("idGarage"); }}
              required
            >
              <option value="" disabled hidden>Selecciona un garage</option>
              {garages.map((garage) => {
                const id = obtenerIdGarage(garage);
                return (
                  <option key={id} value={id}>
                    {obtenerEtiquetaGarage(garage)}
                  </option>
                );
              })}
            </select>
          </div>
          <FieldValidation conditions={buildConditions(getSchema(), "idGarage", formData)} isTouched={touched.idGarage} />
          
          {formData.idGarage && ubicacionGarageActual && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.85rem",
                fontWeight: "500",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                padding: "0.75rem",
                borderRadius: "8px",
                backgroundColor: "rgb(255, 255, 255)",
                border: "1px solid rgb(59, 130, 246)",
              }}
            >
              <div style={{ display: "flex", gap: "0.35rem" }}>
                <span style={{ color: "#1164e8", opacity: 0.9 }}>Ubicacion:</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ubicacionGarageActual)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4481e2", fontWeight: "600", textDecoration: "underline" }}
                >
                  {ubicacionGarageActual}
                </a>
              </div>

              {loadingDistancia && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.8rem" }}>
                  <Loader size={14} className="animate-spin" />
                  Calculando distancia...
                </div>
              )}

              {distanciaError && (
                <div style={{ display: "flex", gap: "0.35rem", color: "#dc2626", fontSize: "0.8rem" }}>
                  <MapPin size={14} style={{ marginTop: 1 }} />
                  <span>{distanciaError}</span>
                </div>
              )}

              {distanciaInfo && (() => {
                const dist = distanciaInfo.distancia || {};
                const distValor = dist.distanciaValor ?? dist.distancia_valor;
                const esMismaUbic = distValor != null && distValor < 50;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.8rem" }}>
                    {esMismaUbic && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          padding: "0.35rem 0.5rem",
                          backgroundColor: "#dbeafe",
                          borderRadius: "6px",
                          color: "#1e40af",
                          fontWeight: "600",
                        }}
                      >
                        <MapPin size={14} />
                        El garage se encuentra en la misma sede
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <span style={{ color: "#1164e8", opacity: 0.9 }}>Sede:</span>
                      <span style={{ color: "#4481e2", fontWeight: "600" }}>
                        {distanciaInfo.sede?.nombre || distanciaInfo.sede?.ubicacion || "—"}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {distanciaInfo && (() => {
                const sedeLat = distanciaInfo.sede?.latitud;
                const sedeLng = distanciaInfo.sede?.longitud;
                const garageLat = distanciaInfo.garage?.latitud;
                const garageLng = distanciaInfo.garage?.longitud;
                const tieneCoordsSede = sedeLat != null && sedeLng != null;
                const tieneCoordsGarage = garageLat != null && garageLng != null;

                const dist = distanciaInfo.distancia || {};
                const distValor = dist.distanciaValor ?? dist.distancia_valor;
                const distTexto = dist.distanciaTexto ?? dist.distancia_texto;
                const durTexto = dist.duracionTexto ?? dist.duracion_texto;
                const esMismaUbic = distValor != null && distValor < 50;

                if (import.meta.env.DEV) {
                  console.log("[DistanciaSede] datos recibidos:", distanciaInfo, { distValor, distTexto, durTexto });
                }

                const puedeMostrarMapa = esMismaUbic
                  ? tieneCoordsSede
                  : tieneCoordsSede && tieneCoordsGarage;

                if (!mapsLoaded || !puedeMostrarMapa) {
                  if (!puedeMostrarMapa && import.meta.env.DEV) {
                    console.warn("Coordenadas faltantes para el mapa:", {
                      sede: { lat: sedeLat, lng: sedeLng },
                      garage: { lat: garageLat, lng: garageLng },
                    });
                  }
                  const mostrarDistancia = !esMismaUbic && (
                    distTexto || durTexto
                  );
                  return mostrarDistancia ? (
                    <div style={{ marginTop: "0.5rem", padding: "0.75rem", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px dashed #94a3b8", fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>
                      <MapPin size={16} style={{ marginBottom: "0.25rem" }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "center" }}>
                        <div>{puedeMostrarMapa ? "Cargando mapa..." : "No hay coordenadas disponibles para mostrar el mapa."}</div>
                        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.15rem" }}>
                          <span style={{ fontWeight: 600, color: "#075985" }}>
                            Distancia: {distTexto || "—"}
                          </span>
                          <span style={{ fontWeight: 600, color: "#075985" }}>
                            Tiempo: {durTexto || "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: "0.5rem", padding: "0.75rem", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px dashed #94a3b8", fontSize: "0.8rem", color: "#64748b", textAlign: "center" }}>
                      <MapPin size={16} style={{ marginBottom: "0.25rem" }} />
                      <div>No hay coordenadas disponibles para mostrar el mapa.</div>
                    </div>
                  );
                }

                const centro = esMismaUbic
                  ? { lat: sedeLat, lng: sedeLng }
                  : { lat: (sedeLat + garageLat) / 2, lng: (sedeLng + garageLng) / 2 };

                return (
                  <div style={{ marginTop: "0.5rem", borderRadius: "8px", overflow: "hidden", height: "180px", position: "relative" }}>
                    {!esMismaUbic && (
                      <div style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        zIndex: 10,
                        backgroundColor: "rgba(255,255,255,0.92)",
                        borderRadius: "8px",
                        padding: "8px 12px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        fontSize: "0.8rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        backdropFilter: "blur(4px)",
                      }}>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <span style={{ color: "#1164e8", fontWeight: 600 }}>Distancia:</span>
                          <span style={{ color: "#075985", fontWeight: 600 }}>
                            {distTexto || "—"}
                          </span>
                        </div>
                      </div>
                    )}
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={centro}
                      zoom={esMismaUbic ? 15 : 13}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                      }}
                    >
                      {esMismaUbic ? (
                        <Marker
                          position={{ lat: sedeLat, lng: sedeLng }}
                          label={{ text: "S/G", color: "#fff", fontWeight: "bold", fontSize: "12px" }}
                          title={"Sede y Garage: " + (distanciaInfo.sede.nombre || "")}
                        />
                      ) : (
                        <>
                          <Marker
                            position={{ lat: sedeLat, lng: sedeLng }}
                            label={{ text: "S", color: "#fff", fontWeight: "bold", fontSize: "14px" }}
                            title={"Sede: " + (distanciaInfo.sede.nombre || "")}
                          />
                          <Marker
                            position={{ lat: garageLat, lng: garageLng }}
                            label={{ text: "G", color: "#fff", fontWeight: "bold", fontSize: "14px" }}
                            title={"Garage: " + (distanciaInfo.garage.nombre || "")}
                          />
                        </>
                      )}
                    </GoogleMap>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {requierePago && (
          <div className="reserva-pago-preview" role="status">
            <WalletCards size={20} />
            <div>
              <strong>El cupo gratuito de tu empresa se agotó</strong>
              <span>
                Hay {disponibilidadPreview.lugares_pagos_disponibles} lugares pagos disponibles por {precioFormateado}.
              </span>
            </div>
          </div>
        )}

        {sinDisponibilidad && (
          <p className="reserva-sin-cupo-preview" role="status">
            Este garage no tiene lugares disponibles para el horario seleccionado.
          </p>
        )}

        <div className="form-field-group">
          <label className="form-field-label" htmlFor="idVehiculo">Vehiculo</label>
          <div className="form-input-icon-wrapper">
            <Car className="form-input-icon" size={18} />
            <select
              id="idVehiculo"
              name="idVehiculo"
              className="form-dropdown-select"
              value={formData.idVehiculo}
              onChange={(e) => { handleChange(e); touch("idVehiculo"); }}
              required
            >
              <option value="" disabled hidden>Selecciona un vehiculo</option>
              {vehiculos.map((vehiculo) => {
                const id = obtenerIdVehiculo(vehiculo);
                return (
                  <option key={id} value={id}>
                    {obtenerEtiquetaVehiculo(vehiculo)}
                  </option>
                );
              })}
            </select>
          </div>
          <FieldValidation conditions={buildConditions(getSchema(), "idVehiculo", formData)} isTouched={touched.idVehiculo} />
          {vehiculos.length === 0 && (
            <EmptyState
              size="sm"
              icon={Car}
              title="Sin vehículos registrados"
              description="Necesitás al menos un vehículo guardado para reservar."
              action={{ label: "Agregar vehículo", to: "/agregar_vehiculo", icon: Plus }}
            />
          )}
        </div>

        {error && <p className="form-error-message" role="alert">{error}</p>}

        <div className="form-submit-container">
          <button
            type="submit"
            className="submit-reservation-button"
            disabled={loading || !datosCompletos || sinDisponibilidad}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>
              {loading
                ? "Procesando..."
                : vehiculos.length === 0
                  ? "Sin vehiculos disponibles"
                  : garages.length === 0
                    ? "Sin garages disponibles"
                    : sinDisponibilidad
                      ? "Garage sin disponibilidad"
                      : requierePago
                        ? "Pagar lugar"
                        : "Confirmar reserva"}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
});

export default FormularioReserva;
