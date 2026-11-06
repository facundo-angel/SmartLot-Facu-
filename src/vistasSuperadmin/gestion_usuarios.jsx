import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  UserPlus,
  ArrowLeft,
  Archive,
  Inbox,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Swal from "sweetalert2";
import { Z_INDEX } from "../helpers/zIndex";
import { showToast } from "../helpers/toast";
import { guardarSuperadminBackup, guardarUsuarioImpersonado } from "../helpers/superadminSession";
import { useAuth } from "../contexts/useAuth";

import "./gestion_usuarios.css";
import HeaderSuperadmin from "../componentesSuperadmin/header_superadmin";
import FooterSuperadmin from "../componentesSuperadmin/footer_superadmin";
import BotonGenerico from "../componentesAdmin/boton_generico";
import EmptyState from "../componentesCompartidos/EmptyState";
import AuditoriaPanel from "../componentesCompartidos/AuditoriaPanel";
import UsuarioCard, { UserCardSkeleton } from "../componentesSuperadmin/gestion_usuarios/usuario_card";
import UsuariosToolbar from "../componentesSuperadmin/gestion_usuarios/usuarios_toolbar";
import ModalArchivados from "../componentesSuperadmin/gestion_usuarios/modal_archivados";
import ModalSolicitudes from "../componentesSuperadmin/gestion_usuarios/modal_solicitudes";
import ModalGaragesUsuario from "../componentesSuperadmin/gestion_usuarios/modal_garages_usuario";
import { ROLE_ORDER } from "../componentesSuperadmin/gestion_usuarios/constantes";
import {
  crearEventosAuditoriaUsuario,
  normalizarUsuario,
  obtenerListado,
  obtenerOpcionesUnicas,
} from "../componentesSuperadmin/gestion_usuarios/helpers";
import {
  UsuariosGetAll,
  UsuariosGetAuditoria,
  UsuariosDelete,
  UsuariosPatchEstado,
  UsuariosImpersonate,
} from "../servicies/API_Usuario";
import { EmpresasGetAll } from "../servicies/API_Empresa";
import { SedesGetAll } from "../servicies/API_Sede";
import { GaragesGetAll } from "../servicies/API_Garage";
import {
  SolicitudesRegistroGetAll,
  SolicitudesRegistroAprobar,
  SolicitudesRegistroRechazar,
} from "../servicies/API_SolicitudRegistro";
import { getUserHomeRoute } from '../helpers/roles';
import { mergeUsuariosById } from '../helpers/usuarios';

gsap.registerPlugin(useGSAP);

const GestionUsuarios = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  const [usuarios, setUsuarios] = useState([]);
  const [sedeMap, setSedeMap] = useState({});
  const [garageMap, setGarageMap] = useState({});
  const [auditoria, setAuditoria] = useState([]);
  const [loadingAuditoria, setLoadingAuditoria] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchArchivedTerm, setSearchArchivedTerm] = useState("");
  const [selectedRol, setSelectedRol] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState("");
  const [selectedSede, setSelectedSede] = useState("");
  const [selectedGarage, setSelectedGarage] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [garagesModalUsuario, setGaragesModalUsuario] = useState(null);
  const [solicitudes, setSolicitudes] = useState([]);
  const [showSolicitudes, setShowSolicitudes] = useState(false);
  const [searchSolicitudesTerm, setSearchSolicitudesTerm] = useState("");
  const [resolviendoSolicitud, setResolviendoSolicitud] = useState(null);
  const { usuario, setUsuario, setRoleTransition } = useAuth();

  // Contabilizamos cuántos filtros secundarios hay activos
  const activeFiltersCount = [selectedEmpresa, selectedSede, selectedGarage].filter(Boolean).length;

  useEffect(() => {
    setSelectedEmpresa("");
    setSelectedSede("");
    setSelectedGarage("");
  }, [selectedRol]);

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

        const eMap = Object.fromEntries(empresas.map((e) => [Number(e.id), e.nombre]));
        const sMap = Object.fromEntries(sedes.map((s) => [Number(s.id), s.nombre]));
        const gMap = {};
        garages.forEach((g) => {
          const id = g.id_garage ?? g.id ?? g._id;
          if (id != null) gMap[Number(id)] = g.nombre || g.name || g.descripcion || g.ubicacion || g.nombre_garage || g.garage_nombre || "Garage";
        });

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
    const eMap = Object.fromEntries(empresas.map((e) => [Number(e.id), e.nombre]));
    setUsuarios(
      mergeUsuariosById(obtenerListado(usuRes.datos)).map((u) =>
        normalizarUsuario(u, eMap, sedeMap, garageMap)
      )
    );
  };

  useEffect(() => {
    if (!showArchived) {
      setSearchArchivedTerm("");
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e) => {
      if (e.key === "Escape") setShowArchived(false);
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [showArchived]);

  const empresasDisponibles = useMemo(() => {
    return obtenerOpcionesUnicas(
      usuarios.filter((u) => {
        if (u.activo === false) return false;
        if (selectedRol && u.id_rol !== Number(selectedRol)) return false;
        if (selectedSede && u.sede !== selectedSede) return false;
        if (selectedGarage && !u.garages.includes(selectedGarage)) return false;
        return true;
      }),
      (u) => u.empresa
    );
  }, [usuarios, selectedRol, selectedSede, selectedGarage]);

  const sedesDisponibles = useMemo(() => {
    return obtenerOpcionesUnicas(
      usuarios.filter((u) => {
        if (u.activo === false) return false;
        if (selectedRol && u.id_rol !== Number(selectedRol)) return false;
        if (selectedEmpresa && u.empresa !== selectedEmpresa) return false;
        if (selectedGarage && !u.garages.includes(selectedGarage)) return false;
        return true;
      }),
      (u) => u.sede
    );
  }, [usuarios, selectedRol, selectedEmpresa, selectedGarage]);

  const garagesDisponibles = useMemo(() => {
    return obtenerOpcionesUnicas(
      usuarios.filter((u) => {
        if (u.activo === false) return false;
        if (selectedRol && u.id_rol !== Number(selectedRol)) return false;
        if (selectedEmpresa && u.empresa !== selectedEmpresa) return false;
        if (selectedSede && u.sede !== selectedSede) return false;
        return u.garages.length > 0;
      }),
      (u) => u.garages
    );
  }, [usuarios, selectedRol, selectedEmpresa, selectedSede]);

  useEffect(() => {
    if (selectedEmpresa && !empresasDisponibles.includes(selectedEmpresa)) {
      setSelectedEmpresa("");
    }
  }, [empresasDisponibles, selectedEmpresa]);

  useEffect(() => {
    if (selectedSede && !sedesDisponibles.includes(selectedSede)) {
      setSelectedSede("");
    }
  }, [sedesDisponibles, selectedSede]);

  useEffect(() => {
    if (selectedGarage && !garagesDisponibles.includes(selectedGarage)) {
      setSelectedGarage("");
    }
  }, [garagesDisponibles, selectedGarage]);

  const usuariosFiltrados = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();

    return usuarios.filter((u) => {
      if (u.activo === false) return false;

      const coincideBusqueda =
        !query ||
        u.nombre.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query);

      const coincideRol = !selectedRol || u.id_rol === Number(selectedRol);
      const coincideEmpresa = !selectedEmpresa || u.empresa === selectedEmpresa;
      const coincideSede = !selectedSede || u.sede === selectedSede;
      const coincideGarage = !selectedGarage || u.garages.includes(selectedGarage);

      return coincideBusqueda && coincideRol && coincideEmpresa && coincideSede && coincideGarage;
    }).sort((a, b) => {
      const orderA = ROLE_ORDER.indexOf(a.id_rol);
      const orderB = ROLE_ORDER.indexOf(b.id_rol);
      if (orderA !== orderB) return orderA - orderB;
      if (!a.empresa && !b.empresa) return 0;
      if (!a.empresa) return 1;
      if (!b.empresa) return -1;
      return a.empresa.localeCompare(b.empresa, 'es', { sensitivity: 'base' });
    });
  }, [searchTerm, selectedRol, selectedEmpresa, selectedSede, selectedGarage, usuarios]);

  const usuariosArchivados = useMemo(() => {
    const query = searchArchivedTerm.toLowerCase().trim();
    return usuarios.filter((u) => {
      if (u.activo !== false) return false;
      if (!query) return true;
      return (
        u.nombre.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query)
      );
    });
  }, [searchArchivedTerm, usuarios]);

  const totalArchivados = useMemo(
    () => usuarios.filter((u) => u.activo === false).length,
    [usuarios]
  );

  const solicitudesPendientes = useMemo(
    () => solicitudes.filter((s) => s?.estado === "pendiente"),
    [solicitudes]
  );

  const totalSolicitudesPendientes = solicitudesPendientes.length;

  const solicitudesFiltradas = useMemo(() => {
    const query = searchSolicitudesTerm.toLowerCase().trim();
    return solicitudesPendientes.filter((s) => {
      if (!query) return true;
      return (
        `${s.nombre || ""} ${s.apellido || ""}`.toLowerCase().includes(query) ||
        (s.email || "").toLowerCase().includes(query) ||
        (s.empresa_nombre || "").toLowerCase().includes(query)
      );
    });
  }, [searchSolicitudesTerm, solicitudesPendientes]);

  const handleAprobarSolicitud = async (solicitud) => {
    const nombreEmpresa = solicitud.empresa_nombre || "la empresa";
    const result = await Swal.fire({
      title: "¿Aprobar solicitud?",
      text: `Se creará ${nombreEmpresa} y su usuario administrador.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16A34A",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Sí, aprobar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      zIndex: Z_INDEX.SWAL_DIALOG,
    });

    if (!result.isConfirmed) return;

    setResolviendoSolicitud(solicitud.id);
    try {
      const response = await SolicitudesRegistroAprobar(solicitud.id);
      if (response.respuesta) {
        gsap.to(`.solicitud-card-id-${solicitud.id}`, {
          scale: 0.95,
          opacity: 0,
          duration: 0.25,
          ease: "power2.inOut",
          onComplete: async () => {
            await cargarSolicitudes();
            await recargarUsuariosYEmpresas();
            showToast("Empresa y administrador creados.", "success");
          },
        });
      } else {
        Swal.fire("Error", response.datos?.message || "No se pudo aprobar.", "error");
      }
    } catch {
      Swal.fire("Error de red", "Hubo un error al conectar.", "error");
    } finally {
      setResolviendoSolicitud(null);
    }
  };

  const handleRechazarSolicitud = async (solicitud) => {
    const nombreEmpresa = solicitud.empresa_nombre || "la empresa";
    const result = await Swal.fire({
      title: "¿Rechazar solicitud?",
      text: `Se descartará el registro de ${nombreEmpresa}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Sí, rechazar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      zIndex: Z_INDEX.SWAL_DIALOG,
    });

    if (!result.isConfirmed) return;

    setResolviendoSolicitud(solicitud.id);
    try {
      const response = await SolicitudesRegistroRechazar(solicitud.id);
      if (response.respuesta) {
        gsap.to(`.solicitud-card-id-${solicitud.id}`, {
          scale: 0.95,
          opacity: 0,
          duration: 0.25,
          ease: "power2.inOut",
          onComplete: async () => {
            await cargarSolicitudes();
            showToast("Solicitud rechazada.", "success");
          },
        });
      } else {
        Swal.fire("Error", response.datos?.message || "No se pudo rechazar.", "error");
      }
    } catch {
      Swal.fire("Error de red", "Hubo un error al conectar.", "error");
    } finally {
      setResolviendoSolicitud(null);
    }
  };

  const handleArchivar = async (id, nombre) => {
    const result = await Swal.fire({
      title: "¿Archivar a este usuario?",
      text: `${nombre} quedará inactivo.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Sí, archivar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      zIndex: Z_INDEX.SWAL_DIALOG,
    });

    if (!result.isConfirmed) return;

    try {
      const response = await UsuariosPatchEstado(id, false);
      if (response.respuesta) {
        gsap.to(`.usuario-card-id-${id}`, {
          scale: 0.9,
          opacity: 0,
          duration: 0.25,
          ease: "power2.inOut",
          onComplete: () => {
            setUsuarios((prev) =>
              prev.map((u) => (u.id === id ? { ...u, activo: false } : u))
            );
            recargarAuditoria();
          },
        });
      } else {
        Swal.fire("Error", "No se pudo archivar.", "error");
      }
    } catch {
      Swal.fire("Error de red", "Hubo un error al conectar.", "error");
    }
  };

  const handleRestaurar = async (id, nombre) => {
    try {
      const response = await UsuariosPatchEstado(id, true);
      if (response.respuesta) {
        setShowArchived(false);
        setUsuarios((prev) =>
          prev.map((u) => (u.id === id ? { ...u, activo: true } : u))
        );
        await recargarAuditoria();
        Swal.fire({
          title: "Restaurado",
          text: `${nombre} ha sido restaurado.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
          zIndex: Z_INDEX.SWAL_DIALOG,
        });
      } else {
        Swal.fire("Error", "No se pudo restaurar.", "error");
      }
    } catch {
      Swal.fire("Error de red", "Hubo un error al conectar.", "error");
    }
  };

  const handleEliminar = async (id, nombre) => {
    setShowArchived(false);
    const result = await Swal.fire({
      title: "¿Eliminar permanentemente?",
      text: `${nombre} será eliminado del sistema.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      zIndex: Z_INDEX.SWAL_DIALOG,
    });

    if (!result.isConfirmed) return;

    try {
      const response = await UsuariosDelete(id);
      if (response.respuesta) {
        setUsuarios((prev) => prev.filter((u) => u.id !== id));
        await recargarAuditoria();
        Swal.fire("Eliminado", "Usuario eliminado permanentemente.", "success");
      } else {
        Swal.fire("Error", "No se pudo eliminar.", "error");
      }
    } catch {
      Swal.fire("Error de red", "Hubo un error al conectar.", "error");
    }
  };

  const handleLoginAs = async (targetUser) => {
    const result = await Swal.fire({
      title: `¿Ingresar como ${targetUser.nombre}?`,
      text: `Te loguearás con el rol de ${targetUser.role}.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563EB",
      cancelButtonColor: "#64748B",
      confirmButtonText: "Sí, ingresar",
      cancelButtonText: "Cancelar",
      reverseButtons: true,
      zIndex: Z_INDEX.SWAL_DIALOG,
    });

    if (!result.isConfirmed) return;

    guardarSuperadminBackup(usuario);

    let userData = null;

    try {
      const res = await UsuariosImpersonate(targetUser.id);
      if (res.respuesta && res.datos) {
        userData = res.datos.usuario || res.datos;
      }
    } catch {
      // Fallback al targetUser si la API falla
    }

    const finalUser = userData || targetUser;
    guardarUsuarioImpersonado(finalUser);
    setRoleTransition(true);
    setUsuario(finalUser);

    navigate(getUserHomeRoute(finalUser));
  };

  // Animaciones iniciales
  useGSAP(
    () => {
      const header = containerRef.current?.querySelector(".usuarios-animate-header");
      const toolbar = containerRef.current?.querySelector(".usuarios-animate-toolbar");
      if (!header) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } });
      tl.from(header, { y: 30, opacity: 0 });
      if (toolbar) tl.from(toolbar, { y: 20, opacity: 0 }, "-=0.5");
    },
    { scope: containerRef }
  );

  // Animación de lista de tarjetas
  useGSAP(() => {
    const cards = containerRef.current?.querySelectorAll(".usuario-card") ?? [];
    if (cards.length > 0) {
      gsap.fromTo(
        cards,
        { y: 16, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.04,
          duration: 0.35,
          ease: "power2.out",
          overwrite: "auto",
        }
      );
    }
  }, [usuariosFiltrados]);

  // Animación del modal de archivados
  useGSAP(() => {
    if (showArchived) {
      gsap.fromTo(
        ".modal-portal-overlay",
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power2.out" }
      );
      gsap.fromTo(
        ".modal-archivados-panel",
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out", delay: 0.05 }
      );
    }
  }, [showArchived]);

  // Bloqueo de scroll + Escape para la bandeja de solicitudes
  const cerrarSolicitudes = () => {
    setShowSolicitudes(false);
    setSearchSolicitudesTerm("");
  };

  useEffect(() => {
    if (!showSolicitudes) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e) => {
      if (e.key === "Escape") cerrarSolicitudes();
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [showSolicitudes]);

  // Animación de la bandeja de solicitudes
  useGSAP(() => {
    if (showSolicitudes) {
      gsap.fromTo(
        ".modal-portal-overlay",
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: "power2.out" }
      );
      gsap.fromTo(
        ".modal-solicitudes-panel",
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "power3.out", delay: 0.05 }
      );
    }
  }, [showSolicitudes]);

  return (
    <div className="gestion-usuarios-page" ref={containerRef}>
      <HeaderSuperadmin />

      <main className="gestion-usuarios-main">
        <header className="gestion-usuarios-header">
          <div className="usuarios-header-left usuarios-animate-header">
            <button className="boton-back" onClick={() => navigate("/superadmin_dashboard")}>
              <ArrowLeft size={24} />
            </button>
            <div className="usuarios-titulos">
              <h1>Gestión de Usuarios</h1>
              <p>Administra todos los usuarios del sistema.</p>
            </div>
          </div>
          <div className="usuarios-animate-header usuarios-header-actions">
            <BotonGenerico
              className="btn-archivados"
              onClick={() => setShowArchived(true)}
            >
              <Archive size={20} />
              <span>Archivados</span>
              {totalArchivados > 0 && (
                <span className="archivados-count-badge">{totalArchivados}</span>
              )}
            </BotonGenerico>

            <BotonGenerico
              className="btn-solicitudes"
              onClick={() => setShowSolicitudes(true)}
            >
              <Inbox size={20} />
              <span>Solicitudes</span>
              {totalSolicitudesPendientes > 0 && (
                <span className="solicitudes-count-badge">{totalSolicitudesPendientes}</span>
              )}
            </BotonGenerico>

            <BotonGenerico
              className="btn-primario"
              onClick={() => navigate("/superadmin/agregar_usuario")}
            >
              <UserPlus size={20} />
              <span>Agregar usuario</span>
            </BotonGenerico>
          </div>
        </header>

        {loading ? (
          <>
            <div className="usuarios-toolbar-skeleton">
              <div className="skeleton-search" />
              <div className="skeleton-role-pills" />
            </div>
            <div className="usuarios-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <UserCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : (
          <UsuariosToolbar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedRol={selectedRol}
            onSelectRol={setSelectedRol}
            selectedEmpresa={selectedEmpresa}
            selectedSede={selectedSede}
            selectedGarage={selectedGarage}
            onEmpresaChange={(value) => {
              setSelectedEmpresa(value);
              setSelectedSede("");
              setSelectedGarage("");
            }}
            onSedeChange={(value) => {
              setSelectedSede(value);
              setSelectedGarage("");
            }}
            onGarageChange={setSelectedGarage}
            onClearFilters={() => {
              setSelectedEmpresa("");
              setSelectedSede("");
              setSelectedGarage("");
            }}
            activeFiltersCount={activeFiltersCount}
            empresasDisponibles={empresasDisponibles}
            sedesDisponibles={sedesDisponibles}
            garagesDisponibles={garagesDisponibles}
          />
        )}

        {!loading && (
          <AuditoriaPanel
            titulo="Auditoría de usuarios"
            descripcion="Últimas ediciones y borrados registrados."
            eventos={auditoria}
            loading={loadingAuditoria}
            maxItems={10}
          />
        )}

        {!loading && (
          <div className="usuarios-grid">
            {error && <div className="usuarios-feedback-error">{error}</div>}

            {!error && usuariosFiltrados.length > 0
              ? usuariosFiltrados.map((u) => (
                  <UsuarioCard
                    key={u.id}
                    usuario={u}
                    onLoginAs={handleLoginAs}
                    onArchivar={handleArchivar}
                    onVerGarages={setGaragesModalUsuario}
                  />
                ))
              : null}

            {!error && usuariosFiltrados.length === 0 && (
              searchTerm || activeFiltersCount > 0 ? (
                <EmptyState
                  className="usuarios-no-results"
                  size="sm"
                  icon={Search}
                  tone="filtered"
                  title="No se encontraron resultados para tu búsqueda."
                  description="Probá con otros términos o volvé al listado completo."
                  action={{
                    label: "Restablecer filtros",
                    onClick: () => {
                      setSearchTerm("");
                      setSelectedEmpresa("");
                      setSelectedSede("");
                      setSelectedGarage("");
                    },
                  }}
                />
              ) : (
                <EmptyState
                  className="usuarios-no-results"
                  size="sm"
                  icon={UserPlus}
                  title="No hay usuarios registrados en esta categoría."
                  description="Creá el primer usuario para empezar a gestionar tu equipo."
                  action={{ label: "Agregar usuario", to: "/superadmin/agregar_usuario", icon: UserPlus }}
                />
              )
            )}
          </div>
        )}
      </main>

      {garagesModalUsuario && (
        <ModalGaragesUsuario
          usuario={garagesModalUsuario}
          onClose={() => setGaragesModalUsuario(null)}
        />
      )}

      {showArchived && (
        <ModalArchivados
          totalArchivados={totalArchivados}
          usuariosArchivados={usuariosArchivados}
          searchTerm={searchArchivedTerm}
          onSearchChange={setSearchArchivedTerm}
          onClose={() => setShowArchived(false)}
          onRestaurar={handleRestaurar}
          onEliminar={handleEliminar}
        />
      )}

      {showSolicitudes && (
        <ModalSolicitudes
          totalSolicitudesPendientes={totalSolicitudesPendientes}
          solicitudesFiltradas={solicitudesFiltradas}
          searchTerm={searchSolicitudesTerm}
          onSearchChange={setSearchSolicitudesTerm}
          onClose={cerrarSolicitudes}
          resolviendoSolicitud={resolviendoSolicitud}
          onAprobar={handleAprobarSolicitud}
          onRechazar={handleRechazarSolicitud}
        />
      )}

      <FooterSuperadmin />
    </div>
  );
};

export default GestionUsuarios;
