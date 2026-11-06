import Swal from "sweetalert2";

export const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  return [];
};

export const formatearImporte = (importe) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(importe);

export const formatearFecha = (iso) => {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
};

export const estadoClase = (estado) =>
  String(estado || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll(" ", "-");

export const copiar = async (texto, mensaje = "Copiado al portapapeles") => {
  try {
    await navigator.clipboard.writeText(texto);
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: mensaje, showConfirmButton: false, timer: 2000 });
  } catch {
    Swal.fire({ toast: true, position: "top-end", icon: "error", title: "No se pudo copiar", showConfirmButton: false, timer: 2000 });
  }
};
