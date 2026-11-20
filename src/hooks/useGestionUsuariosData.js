import { useEffect, useState } from "react";
import { UsuariosGetAll, UsuariosGetAuditoria } from "../servicies/API_Usuario";
import { EmpresasGetAll } from "../servicies/API_Empresa";
import { SedesGetAll } from "../servicies/API_Sede";
import { GaragesGetAll } from "../servicies/API_Garage";
import { SolicitudesRegistroGetAll } from "../servicies/API_SolicitudRegistro";
import {
  crearEventosAuditoriaUsuario,
  normalizarUsuario,
  obtenerListado,
} from "../componentesSuperadmin/gestion_usuarios/helpers";
import { mergeUsuariosById } from "../helpers/usuarios";

// Helpers puros que construyen los mapas de referencia (id -> nombre) a partir de datos crudos.
export const construirEmpresaMap = (empresas) =>
  Object.fromEntries(empresas.map((e) => [Number(e.id), e.nombre]));

export const construirSedeMap = (sedes) =>
  Object.fromEntries(sedes.map((s) => [Number(s.id), s.nombre]));

export const construirGarageMap = (garages) => {
  const gMap = {};
  garages.forEach((g) => {
    const id = g.id_garage ?? g.id ?? g._id;
    if (id != null) gMap[Number(id)] = g.nombre || g.name || g.descripcion || g.ubicacion || g.nombre_garage || g.garage_nombre || "Garage";
  });
  return gMap;
};

export default function useGestionUsuariosData() {
  const [usuarios, setUsuarios] = useState([]);
  const [sedeMap, setSedeMap] = useState({});
  const [garageMap, setGarageMap] = useState({});
  const [auditoria, setAuditoria] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);

  const recargarAuditoria = async () => {
    setLoadingAuditoria(true);
    const auditRes = await UsuariosGetAuditoria();
    if (auditRes.respuesta) {
      setAuditoria(crearEventosAuditoriaUsuario(obtenerListado(auditRes.datos)));
    }
    setLoadingAuditoria(false);
  };

  const cargarSolicitudes = async () => {
    const solRes = await SolicitudesRegistroGetAll({ force: true });
    if (solRes.respuesta) {
      setSolicitudes(obtenerListado(solRes.datos));
    }
  };

  const recargarUsuariosYEmpresas = async () => {
    const [usuRes, empRes] = await Promise.all([
      UsuariosGetAll({ force: true }),
      EmpresasGetAll({ force: true }),
    ]);
    if (!usuRes.respuesta) return;
    const empresas = empRes.respuesta ? obtenerListado(empRes.datos) : [];
    const eMap = construirEmpresaMap(empresas);
    setUsuarios(
      mergeUsuariosById(obtenerListado(usuRes.datos)).map((u) =>
        normalizarUsuario(u, eMap, sedeMap, garageMap)
      )
    );
  };

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setLoadingAuditoria(true);
      setError("");

      try {
        const [usuRes, empRes, sedRes, garRes, auditRes, solRes] = await Promise.all([
          UsuariosGetAll(),
          EmpresasGetAll(),
          SedesGetAll(),
          GaragesGetAll(),
          UsuariosGetAuditoria(),
          SolicitudesRegistroGetAll(),
        ]);

        if (!mounted) return;

        if (!usuRes.respuesta) {
          setError("No se pudieron cargar los usuarios.");
          setLoading(false);
          return;
        }

        const usuariosRaw = obtenerListado(usuRes.datos);
        const empresas = empRes.respuesta ? obtenerListado(empRes.datos) : [];
        const sedes = sedRes.respuesta ? obtenerListado(sedRes.datos) : [];
        const garages = garRes.respuesta ? obtenerListado(garRes.datos) : [];

        const eMap = construirEmpresaMap(empresas);
        const sMap = construirSedeMap(sedes);
        const gMap = construirGarageMap(garages);

        setSedeMap(sMap);
        setGarageMap(gMap);
        setUsuarios(mergeUsuariosById(usuariosRaw).map((u) => normalizarUsuario(u, eMap, sMap, gMap)));
        if (solRes.respuesta) {
          setSolicitudes(obtenerListado(solRes.datos));
        }
        if (auditRes.respuesta) {
          setAuditoria(crearEventosAuditoriaUsuario(obtenerListado(auditRes.datos)));
        }
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Ocurrió un error inesperado.");
      } finally {
        if (mounted) setLoading(false);
        if (mounted) setLoadingAuditoria(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  return {
    usuarios,
    setUsuarios,
    loading,
    error,
    auditoria,
    loadingAuditoria,
    solicitudes,
    recargarAuditoria,
    cargarSolicitudes,
    recargarUsuariosYEmpresas,
  };
}
