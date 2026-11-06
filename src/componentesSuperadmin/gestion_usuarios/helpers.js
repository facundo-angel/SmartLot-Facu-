import { getUsuarioGarageIds } from "../../helpers/usuarios";
import { ROLE_LABELS } from "./constantes";

export const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.usuarios)) return datos.usuarios;
  return [];
};

const obtenerActorAuditoria = (item, tipo) => {
  const nombre = item?.[`${tipo}ByNombre`]?.trim?.();
  const email = item?.[`${tipo}ByEmail`];
  return nombre || email || "Usuario no disponible";
};

export const crearEventosAuditoriaUsuario = (items) =>
  items
    .flatMap((item) => {
      const nombreUsuario = `${item.nombre || ""} ${item.apellido || ""}`.trim() || item.email || `Usuario ${item.id}`;
      const eventos = [];
      if (item.UpdateAt) {
        eventos.push({
          id: `${item.id}-update-${item.UpdateAt}`,
          accion: "Editado",
          clase: "update",
          entidad: nombreUsuario,
          actor: obtenerActorAuditoria(item, "Update"),
          fecha: item.UpdateAt,
        });
      }
      if (item.DeleteAt || item.Borrado === true) {
        eventos.push({
          id: `${item.id}-delete-${item.DeleteAt || "deleted"}`,
          accion: "Borrado",
          clase: "delete",
          entidad: nombreUsuario,
          actor: obtenerActorAuditoria(item, "Delete"),
          fecha: item.DeleteAt,
        });
      }
      return eventos;
    })
    .sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));

export const obtenerOpcionesUnicas = (items, selector) =>
  Array.from(new Set(items.flatMap((item) => {
    const value = selector(item);
    return Array.isArray(value) ? value : [value];
  }).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );

export const normalizarUsuario = (usuario, empresaMap, sedeMap, garageMap) => {
  const id = usuario.id ?? usuario.id_usuario ?? usuario._id;
  const nombreEmpresa = empresaMap[Number(usuario.id_empresa)] || null;
  const nombreSede = sedeMap[Number(usuario.id_sede)] || null;
  const idGarages = getUsuarioGarageIds(usuario);
  const nombresGarages = idGarages.map((idGarage) => garageMap[idGarage]).filter(Boolean);

  return {
    id,
    id_empresa: !isNaN(Number(usuario.id_empresa)) ? Number(usuario.id_empresa) : null,
    id_sede: usuario.id_sede ?? null,
    id_garage: idGarages[0] ?? null,
    id_garages: idGarages,
    nombre: `${usuario.nombre || ""} ${usuario.apellido || ""}`.trim() || "Usuario sin nombre",
    email: usuario.email || "Sin email",
    telefono: usuario.telefono || "",
    id_rol: Number(usuario.id_rol),
    role: ROLE_LABELS[Number(usuario.id_rol)] || "Desconocido",
    empresa: nombreEmpresa,
    sede: nombreSede,
    garage: nombresGarages[0] ?? null,
    garages: nombresGarages,
    activo: usuario.activo !== false,
  };
};

export const formatearFechaSolicitud = (valor) => {
  if (!valor) return "fecha desconocida";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "fecha desconocida";
  return fecha.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
};
