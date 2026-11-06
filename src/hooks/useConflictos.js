import { useEffect, useMemo, useState } from "react";

import { obtenerListado, perteneceAlTenant } from "../helpers/conflictos";
import { obtenerIdUsuario } from "../componentesCompartidos/utilConflictos";
import {
  ConflictosDelete,
  ConflictosGetAll,
  ConflictosGetPapelera,
  ConflictosRestore,
  ConflictosUpdate,
} from "../servicies/API_Conflicto";
import { UsuariosGetAll } from "../servicies/API_Usuario";
import { GaragesGetAll } from "../servicies/API_Garage";

export default function useConflictos(
  scope,
  { usuario, superAdmin = false, onToast, onRestaurado, notificarCambioEstado = true } = {}
) {
  const [conflictos, setConflictos] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [garagesList, setGaragesList] = useState([]);
  const [loadingConflictos, setLoadingConflictos] = useState(true);
  const [errorConflictos, setErrorConflictos] = useState("");
  const [actualizandoId, setActualizandoId] = useState(null);
  const [cargandoPapelera, setCargandoPapelera] = useState(false);
  const [conflictosResolviendo, setConflictosResolviendo] = useState(() => new Set());
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  useEffect(() => {
    let montado = true;

    const cargarDatos = async () => {
      setLoadingConflictos(true);
      setErrorConflictos("");

      try {
        const [conflictosResponse, papeleraResponse, usuariosResponse, garagesResponse] = await Promise.all([
          ConflictosGetAll({ superAdmin, ...scope }),
          ConflictosGetPapelera({ superAdmin, ...scope }),
          UsuariosGetAll(),
          GaragesGetAll(),
        ]);

        if (!montado) return;

        const adminIdSede = Number(usuario?.id_sede);
        const empresaAdmin = Number(usuario?.id_empresa);
        const tieneEmpresa = !isNaN(empresaAdmin) && empresaAdmin > 0;

        if (usuariosResponse.respuesta) {
          const usuariosList = obtenerListado(usuariosResponse.datos);

          let usuariosFiltrados = usuariosList;
          if (adminIdSede) {
            usuariosFiltrados = usuariosList.filter((u) => Number(u.id_sede ?? u.idSede) === adminIdSede);
          } else if (tieneEmpresa) {
            usuariosFiltrados = usuariosList.filter((u) => Number(u.id_empresa ?? u.idEmpresa) === empresaAdmin);
          }

          const userIdsSet = new Set(usuariosFiltrados.map((u) => Number(obtenerIdUsuario(u))));

          setUsuarios(usuariosFiltrados);

          if (conflictosResponse.respuesta) {
            const allConflictos = obtenerListado(conflictosResponse.datos);
            setConflictos(allConflictos.filter((c) => userIdsSet.has(Number(obtenerIdUsuario(c)))));
          } else {
            setErrorConflictos("No se pudieron cargar los conflictos.");
          }

          if (papeleraResponse.respuesta) {
            const allPapelera = obtenerListado(papeleraResponse.datos);
            setPapelera(allPapelera.filter((p) => userIdsSet.has(Number(obtenerIdUsuario(p)))));
          }
        } else {
          if (conflictosResponse.respuesta) {
            setConflictos(obtenerListado(conflictosResponse.datos));
          } else {
            setErrorConflictos("No se pudieron cargar los conflictos.");
          }

          if (papeleraResponse.respuesta) {
            setPapelera(obtenerListado(papeleraResponse.datos));
          }
        }

        const garArray = obtenerListado(garagesResponse.datos);
        setGaragesList(garArray);
      } catch (error) {
        console.error("Error al cargar datos:", error);
        if (montado) setErrorConflictos("Ocurrio un error al cargar los datos.");
      } finally {
        if (montado) {
          setLoadingConflictos(false);
          setUltimaActualizacion(Date.now());
        }
      }
    };

    cargarDatos();

    return () => {
      montado = false;
    };
  }, [scope, usuario, superAdmin]);

  const usuariosPorId = useMemo(
    () => new Map(usuarios.map((item) => [Number(item.id ?? item.id_usuario), item])),
    [usuarios]
  );

  const conflictosTenant = useMemo(
    () => conflictos.filter((conflicto) => perteneceAlTenant(conflicto, usuariosPorId, scope)),
    [conflictos, usuariosPorId, scope]
  );

  const papeleraTenant = useMemo(
    () => papelera.filter((conflicto) => perteneceAlTenant(conflicto, usuariosPorId, scope)),
    [papelera, usuariosPorId, scope]
  );

  const pendientes = conflictosTenant.filter((conflicto) => conflicto.estado !== "Resuelto").length;

  const cargarPapelera = async ({ force = false } = {}) => {
    setCargandoPapelera(true);
    const papeleraResponse = await ConflictosGetPapelera({ superAdmin, force, ...scope });
    if (papeleraResponse.respuesta) {
      setPapelera(obtenerListado(papeleraResponse.datos));
    } else {
      setErrorConflictos("No se pudo cargar la papelera.");
    }
    setCargandoPapelera(false);
  };

  const cambiarEstado = async (conflicto, estado) => {
    const estadoAnterior = conflicto.estado;
    if (estadoAnterior === estado) return;
    setActualizandoId(conflicto.id);
    const payload = {
      id_usuario: obtenerIdUsuario(conflicto),
      descripcion: conflicto.descripcion,
      prioridad: conflicto.prioridad,
      estado,
      SuperAdmin: conflicto.SuperAdmin === true,
    };

    const resultado = await ConflictosUpdate(conflicto.id, payload);
    if (resultado.respuesta) {
      if (estado === "Resuelto") {
        const resultadoEliminar = await ConflictosDelete(conflicto.id);
        if (resultadoEliminar.respuesta) {
          setConflictosResolviendo((prev) => new Set(prev).add(conflicto.id));
          await new Promise((resolve) => setTimeout(resolve, 520));
          setConflictos((prev) => prev.filter((item) => item.id !== conflicto.id));
          setConflictosResolviendo((prev) => {
            const next = new Set(prev);
            next.delete(conflicto.id);
            return next;
          });
          await cargarPapelera({ force: true });
          onToast?.("Conflicto resuelto y enviado a papelera", async () => {
            const restaurado = await ConflictosRestore(conflicto.id);
            if (!restaurado.respuesta) return;

            const revert = await ConflictosUpdate(conflicto.id, { ...payload, estado: estadoAnterior });
            const conflictoRestaurado = revert.respuesta ? revert.datos : restaurado.datos;
            setPapelera((prev) => prev.filter((item) => item.id !== conflicto.id));
            setConflictos((prev) => [conflictoRestaurado, ...prev.filter((item) => item.id !== conflicto.id)]);
            await cargarPapelera({ force: true });
          });
        } else {
          setConflictos((prev) => prev.map((item) => item.id === conflicto.id ? resultado.datos : item));
        }
      } else {
        setConflictos((prev) => prev.map((item) => item.id === conflicto.id ? resultado.datos : item));
        if (notificarCambioEstado) {
          onToast?.(`Estado cambiado a "${estado}"`, async () => {
            const revert = await ConflictosUpdate(conflicto.id, { ...payload, estado: estadoAnterior });
            if (revert.respuesta) {
              setConflictos((prev) => prev.map((item) => item.id === conflicto.id ? revert.datos : item));
            }
          });
        }
      }
    }
    setActualizandoId(null);
  };

  const restaurar = async (id) => {
    setActualizandoId(id);
    const resultado = await ConflictosRestore(id);
    if (resultado.respuesta) {
      setPapelera((prev) => prev.filter((item) => item.id !== id));
      setConflictos((prev) => [resultado.datos, ...prev.filter((item) => item.id !== id)]);
      onRestaurado?.();
      await cargarPapelera({ force: true });
    }
    setActualizandoId(null);
  };

  const eliminar = async (id) => {
    setActualizandoId(id);
    const resultado = await ConflictosDelete(id);
    if (resultado.respuesta) {
      const conflictoEliminado = conflictos.find((item) => item.id === id);
      setConflictos((prev) => prev.filter((item) => item.id !== id));
      await cargarPapelera({ force: true });
      onToast?.("Conflicto eliminado", () => {
        if (conflictoEliminado) restaurar(id);
      });
    }
    setActualizandoId(null);
  };

  const limpiarError = () => setErrorConflictos("");

  return {
    conflictosTenant,
    papeleraTenant,
    usuariosPorId,
    garagesList,
    pendientes,
    loadingConflictos,
    errorConflictos,
    actualizandoId,
    cargandoPapelera,
    conflictosResolviendo,
    ultimaActualizacion,
    cargarPapelera,
    cambiarEstado,
    eliminar,
    restaurar,
    limpiarError,
  };
}
