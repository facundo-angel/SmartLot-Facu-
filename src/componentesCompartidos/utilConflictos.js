export const obtenerIdUsuario = (item) => item?.id_usuario ?? item?.idUsuario ?? item?.usuario_id ?? item?.id;

export const obtenerFechaConflicto = (item) =>
  item?.fecha_creacion ?? item?.fechaCreacion ?? item?.created_at ?? item?.createdAt ?? item?.CreateAt;

export const obtenerFechaBorrado = (item) =>
  item?.DeleteAt ?? item?.deleteAt ?? item?.deleted_at ?? item?.deletedAt;

export const formatearFecha = (fecha) => {
  if (!fecha) return "Sin fecha";
  const date = new Date(fecha);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const prioridadClase = (prioridad) => {
  const valor = String(prioridad || "").toLowerCase();
  if (valor === "alta") return "alta";
  if (valor === "media") return "media";
  return "baja";
};

export const estadoClase = (estado) => {
  const valor = String(estado || "").toLowerCase();
  if (valor.includes("resuelto")) return "resuelto";
  if (valor.includes("proceso")) return "proceso";
  return "pendiente";
};
