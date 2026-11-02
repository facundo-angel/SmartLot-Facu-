import { normalizeReservaDateTime, formatReservaDate, mergeReservaEdit } from '../helpers/reservaDateTime';
import { useState, useCallback } from "react";
import Swal from "sweetalert2";
import { Z_INDEX } from "../helpers/zIndex";
import { ReservasUpdate, ReservasCancel } from "../servicies/API_Reserva";
import ModalPortal from "../componentesCompartidos/ModalPortal";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";
import FieldValidation from "../components/FieldValidation";
import "./modal_editar_reserva.css";

const obtenerCampo = (item, claves, fallback = "") => {
  const clave = claves.find((key) => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "");
  return clave ? item[clave] : fallback;
};

function ModalEditarReserva({ reservaRaw, reservaNorm, onClose, onActualizada, onEliminada }) {
  const time = normalizeReservaDateTime({ ...reservaRaw, ...reservaNorm });
  const fechaBase = time.fecha || "";
  const [horaInicio, setHoraInicio] = useState(() => time.hora_entrada || "");
  const [horaFin, setHoraFin] = useState(() => time.hora_salida || "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const getSchema = () => ({
    horaInicio: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
      { rule: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v), message: "Formato HH:MM" },
    ],
    horaFin: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
      { rule: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v), message: "Formato HH:MM" },
      () => ({ rule: () => !horaInicio || !horaFin || horaInicio < horaFin, message: "Debe ser posterior a hora inicio" }),
    ],
  });

  const formData = { horaInicio, horaFin };
  const validationSchema = getSchema();
  const { isValid, touched, touch } = useLiveValidation(formData, validationSchema);

  const handleGuardar = useCallback(async () => {
    if (!isValid) {
      setError("Corrige los errores antes de guardar.");
      return;
    }

    setGuardando(true);
    setError("");

    const idReserva = Number(reservaRaw.id ?? reservaRaw.id_reserva);
    const idUsuario = Number(obtenerCampo(reservaRaw, ["id_usuario", "idUsuario", "usuario_id", "usuarioId"]));
    const idVehiculo = Number(obtenerCampo(reservaRaw, ["id_vehiculo", "idVehiculo", "vehiculo_id", "vehiculoId"]));
    const idGarage = Number(obtenerCampo(reservaRaw, ["id_garage", "idGarage", "garage_id", "garageId"]));

    // Timestamps locales sin offset: conservar literalmente la hora almacenada.
    const payload = {
      fecha_entrada: `${fechaBase}T${horaInicio}:00`,
      fecha_salida: `${time.fecha_salida?.slice(0, 10) || fechaBase}T${horaFin}:00`,
      id_usuario: idUsuario,
      id_vehiculo: idVehiculo,
      id_garage: idGarage,
      idUsuario,
      idVehiculo,
      idGarage,
    };

    const resultado = await ReservasUpdate(idReserva, payload);

    setGuardando(false);

    if (resultado.respuesta) {
      const actualizada = mergeReservaEdit(reservaRaw, resultado.datos, {
        fecha_entrada: payload.fecha_entrada,
        fecha_salida: payload.fecha_salida,
      });
      onActualizada(actualizada);
    } else {
      setError(resultado.datos?.message || "No se pudo actualizar la reserva. Intenta de nuevo.");
    }
  }, [horaInicio, horaFin, fechaBase, time.fecha_salida, reservaRaw, onActualizada, isValid]);

  const handleEliminar = useCallback(async () => {
    onClose();

    const confirmacion = await Swal.fire({
      title: "Cancelar reserva",
      text: "Esta accion no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Si, cancelar",
      cancelButtonText: "Volver",
      zIndex: Z_INDEX.SWAL_DIALOG,
    });

    if (!confirmacion.isConfirmed) return;

    const idReserva = Number(reservaRaw.id ?? reservaRaw.id_reserva);
    const resultado = await ReservasCancel(idReserva);

    if (resultado.respuesta) {
      Swal.fire({
        icon: "success",
        title: "Reserva cancelada",
        text: "La reserva fue eliminada correctamente.",
        timer: 1500,
        showConfirmButton: false,
        zIndex: Z_INDEX.SWAL_DIALOG,
      });
      onEliminada(idReserva);
    } else {
      setError("No se pudo cancelar la reserva. Intenta de nuevo.");
    }
  }, [reservaRaw, onEliminada, onClose]);

  const fechaFormateada = formatReservaDate(fechaBase);


  return (
    <ModalPortal onClose={onClose}>
      <div className="modal-reserva-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-reserva-header">
          <h2>Detalle de reserva</h2>
          <button type="button" className="modal-reserva-close" onClick={onClose} aria-label="Cerrar">
            &#x2715;
          </button>
        </div>

        <div className="modal-reserva-body">
          <div className="modal-reserva-field">
            <span className="modal-reserva-field-label">Fecha</span>
            <span className="modal-reserva-field-value">{fechaFormateada}</span>
          </div>

          <div className="modal-reserva-field">
            <span className="modal-reserva-field-label">Garage</span>
            <span className="modal-reserva-field-value">{reservaNorm?.nombre_garage || "—"}</span>
          </div>

          <div className="modal-reserva-field">
            <span className="modal-reserva-field-label">Vehiculo</span>
            <span className="modal-reserva-field-value">{reservaNorm?.plaza || "—"}</span>
          </div>

          <div className="modal-reserva-divider" />

          <p className="modal-reserva-times-title">Modificar horario</p>

          <div className="modal-reserva-time-row">
            <div className="modal-reserva-time-group">
              <label htmlFor="modal-hora-inicio">Hora inicio</label>
              <input
                id="modal-hora-inicio"
                type="time"
                className="modal-reserva-time-input"
                value={horaInicio === "--:--" ? "" : horaInicio}
                onChange={(e) => { setHoraInicio(e.target.value); touch("horaInicio"); }}
                autoComplete="off"
                required
              />
              <FieldValidation conditions={buildConditions(validationSchema, "horaInicio", formData)} isTouched={touched.horaInicio} />
            </div>
            <div className="modal-reserva-time-group">
              <label htmlFor="modal-hora-fin">Hora fin</label>
              <input
                id="modal-hora-fin"
                type="time"
                className="modal-reserva-time-input"
                value={horaFin === "--:--" ? "" : horaFin}
                onChange={(e) => { setHoraFin(e.target.value); touch("horaFin"); }}
                autoComplete="off"
                required
              />
              <FieldValidation conditions={buildConditions(validationSchema, "horaFin", formData)} isTouched={touched.horaFin} />
            </div>
          </div>

          {error && <p className="modal-reserva-error" role="alert">{error}</p>}
        </div>

        <div className="modal-reserva-footer">
          <button
            type="button"
            className="modal-reserva-btn-guardar"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            className="modal-reserva-btn-cancelar"
            onClick={handleEliminar}
          >
            Cancelar reserva
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}

export default ModalEditarReserva;
