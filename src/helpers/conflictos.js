import { obtenerIdUsuario } from "../componentesCompartidos/utilConflictos.js";

export const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.conflictos)) return datos.conflictos;
  if (Array.isArray(datos?.usuarios)) return datos.usuarios;
  return [];
};

export const obtenerIdEmpresa = (item) =>
  item?.id_empresa ?? item?.idEmpresa ?? item?.empresa_id ?? item?.empresaId;

export const obtenerIdSede = (item) =>
  item?.id_sede ?? item?.idSede ?? item?.sede_id ?? item?.sedeId;

export const crearScopeConflictos = (usuario) => {
  const idSede = obtenerIdSede(usuario);
  const idEmpresa = obtenerIdEmpresa(usuario);
  const idUsuario = obtenerIdUsuario(usuario);

  return {
    idSede,
    idEmpresa,
    idUsuario,
    scopeKey: idSede
      ? "sede:" + idSede
      : idEmpresa
        ? "empresa:" + idEmpresa
        : "usuario:" + (idUsuario || "unknown"),
  };
};

export const perteneceAlTenant = (conflicto, usuariosPorId, scope) => {
  const conflictoEmpresa = obtenerIdEmpresa(conflicto);
  const conflictoSede = obtenerIdSede(conflicto);
  const usuarioConflicto = usuariosPorId.get(Number(obtenerIdUsuario(conflicto)));
  const usuarioEmpresa = obtenerIdEmpresa(usuarioConflicto);
  const usuarioSede = obtenerIdSede(usuarioConflicto);

  if (scope.idSede) {
    return Number(conflictoSede || usuarioSede) === Number(scope.idSede);
  }

  if (scope.idEmpresa) {
    return Number(conflictoEmpresa || usuarioEmpresa) === Number(scope.idEmpresa);
  }

  return false;
};

export const ordenarConflictos = (conflictos) => {
  const pesoEstado = { Pendiente: 0, "En Proceso": 1, Resuelto: 2 };
  const pesoPrioridad = { Alta: 0, Media: 1, Baja: 2 };

  return [...conflictos].sort((a, b) => {
    const estadoDiff = (pesoEstado[a.estado] ?? 9) - (pesoEstado[b.estado] ?? 9);
    if (estadoDiff !== 0) return estadoDiff;

    const prioridadDiff = (pesoPrioridad[a.prioridad] ?? 9) - (pesoPrioridad[b.prioridad] ?? 9);
    if (prioridadDiff !== 0) return prioridadDiff;

    return new Date(b.fecha_creacion || 0) - new Date(a.fecha_creacion || 0);
  });
};

export const filtrarConflictos = (conflictos, busqueda, usuariosPorId) => {
  const query = busqueda.trim().toLowerCase();
  if (!query) return conflictos;

  return conflictos.filter((conflicto) => {
    const usuarioConflicto = usuariosPorId.get(Number(obtenerIdUsuario(conflicto)));
    const nombreUsuario = usuarioConflicto
      ? `${usuarioConflicto.nombre || ""} ${usuarioConflicto.apellido || ""} ${usuarioConflicto.email || ""}`
      : "";
    return [
      nombreUsuario,
      conflicto.descripcion,
      conflicto.prioridad,
      conflicto.estado,
      obtenerIdUsuario(conflicto),
    ].some((valor) => String(valor || "").toLowerCase().includes(query));
  });
};
