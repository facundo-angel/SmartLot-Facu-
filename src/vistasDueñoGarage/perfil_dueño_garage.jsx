import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Lock, User, Warehouse } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Swal from "sweetalert2";
import { Z_INDEX } from "../helpers/zIndex";
import HeaderDueñoGarage from "../componentesDueñoGarage/header_dueño_garage";
import FooterDueñoGarage from "../componentesDueñoGarage/footer_dueño_garage";
import { useAuth } from "../contexts/useAuth";
import { obtenerSuperadminBackup, eliminarSuperadminBackup, eliminarUsuarioImpersonado } from "../helpers/superadminSession";
import { clearCache } from "../cache/cacheStore";
import apiClient from "../servicies/apiClient";
import { UsuariosGetById } from "../servicies/API_Usuario";
import { GaragesGetAll } from "../servicies/API_Garage";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";
import FieldValidation from "../components/FieldValidation";
import "./perfil_dueño_garage.css";

gsap.registerPlugin(useGSAP);

const obtenerIdUsuario = (usr) => usr?.id ?? usr?.id_usuario ?? usr?._id;

const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.garages)) return datos.garages;
  if (Array.isArray(datos?.value)) return datos.value;
  return [];
};

export default function PerfilDueñoGarage() {
  const navigate = useNavigate();
  const mainScopeRef = useRef(null);
  const { usuario, setUsuario, loading, setRoleTransition } = useAuth();

  const validationSchema = {
    telefono: [
      { rule: (v) => v?.trim().length > 0, message: "Requerido" },
      { rule: (v) => !v || /^[+]{0,1}[0-9\s-()]+$/.test(v), message: "Solo números, +, espacios, (), -" },
      { rule: (v) => !v || v.replace(/\D/g, "").length >= 7, message: "Mínimo 7 dígitos" },
    ],
    contraseña: [
      { rule: (v) => !v || v?.length > 0, message: "Requerido" },
      { rule: (v) => !v || v?.length >= 8, message: "Mínimo 8 caracteres" },
      { rule: (v) => !v || (v?.match(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/g) || []).length >= 2, message: "Mínimo 2 caracteres especiales" },
      { rule: (v) => !v || (v?.match(/\d/g) || []).length >= 2, message: "Mínimo 2 números" },
      { rule: (v) => !v || (v?.match(/[A-Z]/g) || []).length >= 2, message: "Mínimo 2 mayúsculas" },
    ],
  };

  const [personalData, setPersonalData] = useState({ nombre: "", apellido: "", email: "", telefono: "", contraseña: "" });
  const [originalPersonalData, setOriginalPersonalData] = useState({ nombre: "", apellido: "", email: "", telefono: "", contraseña: "" });
  const [garagesCount, setGaragesCount] = useState(0);
  const [cargandoGarages, setCargandoGarages] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const { isValid, touched, getFieldProps } = useLiveValidation(personalData, validationSchema);
  const telefonoField = getFieldProps("telefono", setPersonalData);
  const contraseñaField = getFieldProps("contraseña", setPersonalData);

  const isDirty = useMemo(() => (
    personalData.nombre !== originalPersonalData.nombre ||
    personalData.apellido !== originalPersonalData.apellido ||
    personalData.email !== originalPersonalData.email ||
    personalData.telefono !== originalPersonalData.telefono ||
    personalData.contraseña !== originalPersonalData.contraseña
  ), [personalData, originalPersonalData]);

  useEffect(() => {
    if (!usuario) return;
    let montado = true;

    const fetchUsuarioCompleto = async () => {
      try {
        const id = Number(obtenerIdUsuario(usuario));
        if (!id) throw new Error("Sin ID de usuario en la sesión.");
        const res = await UsuariosGetById(id);
        if (!montado) return;
        if (!res.respuesta) throw new Error("No se pudo cargar el perfil completo.");

        const userData = res.datos;
        const payload = {
          nombre: userData.nombre || "",
          apellido: userData.apellido || "",
          email: userData.email || "",
          telefono: userData.telefono || "",
          contraseña: "",
        };

        setPersonalData(payload);
        setOriginalPersonalData(payload);
      } catch (err) {
        if (!montado) return;
        console.error("No se pudo cargar perfil completo, usando datos de sesión:", err);
        const infoUsuario = usuario.datos || usuario.usuario || usuario;

        const payloadBackup = {
          nombre: infoUsuario.nombre || usuario.nombre || "",
          apellido: infoUsuario.apellido || usuario.apellido || "",
          email: infoUsuario.email || usuario.email || "",
          telefono: infoUsuario.telefono || usuario.telefono || "",
          contraseña: "",
        };

        setPersonalData(payloadBackup);
        setOriginalPersonalData(payloadBackup);
      }
    };

    fetchUsuarioCompleto();
    return () => { montado = false; };
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    let montado = true;

    const cargarGarages = async () => {
      setCargandoGarages(true);
      const res = await GaragesGetAll();
      if (!montado) return;
      setGaragesCount(obtenerListado(res.datos).length);
      setCargandoGarages(false);
    };

    cargarGarages();
    return () => { montado = false; };
  }, [usuario]);

  const handleVolverConVerificacion = () => {
    if (isDirty) {
      Swal.fire({
        title: "¿Descartar cambios?",
        text: "Tienes modificaciones en tu perfil que no has guardado. Si sales perderás los cambios.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e11d48",
        cancelButtonColor: "#64748b",
        confirmButtonText: "Sí, salir",
        cancelButtonText: "Permanecer aquí",
        zIndex: Z_INDEX.SWAL_DIALOG,
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/duenio-garage/dashboard");
        }
      });
    } else {
      navigate("/duenio-garage/dashboard");
    }
  };

  useEffect(() => {
    const manejarAntesDeSalir = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", manejarAntesDeSalir);
    return () => {
      window.removeEventListener("beforeunload", manejarAntesDeSalir);
    };
  }, [isDirty]);

  useGSAP(() => {
    if (loading || !usuario) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".animate-dueño-back", { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.4 })
      .fromTo(".duenio-perfil-titulos", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.2")
      .fromTo(".duenio-perfil-statusbar", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3")
      .fromTo(".duenio-perfil-card", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, "-=0.3")
      .fromTo(".duenio-perfil-actions", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.2");
  }, { dependencies: [loading, usuario], scope: mainScopeRef });

  const handleGuardarCambios = async (e) => {
    e.preventDefault();
    if (guardando) return;

    if (!isValid) return;

    const telefonoLimpio = personalData.telefono?.replace(/\D/g, "") || "";
    const nuevaContraseña = personalData.contraseña?.trim() || "";
    const contraseñaCambiada = nuevaContraseña.length > 0;

    setGuardando(true);

    try {
      const subUsuario = usuario?.datos || usuario?.usuario || {};
      const idUsuarioFinal = usuario?.id_usuario || usuario?.id || subUsuario.id_usuario || subUsuario.id;

      if (!idUsuarioFinal) {
        throw new Error("No se pudo detectar el ID del usuario activo en la sesión.");
      }

      await apiClient.put(`/api/usuario/${idUsuarioFinal}`, {
        telefono: telefonoLimpio
      });

      if (contraseñaCambiada) {
        await apiClient.patch(`/api/usuario/${idUsuarioFinal}/contraseña`, {
          contraseña: nuevaContraseña
        });
      }

      const datosActualizados = { ...personalData, telefono: telefonoLimpio, contraseña: "" };
      setPersonalData(datosActualizados);
      setOriginalPersonalData(datosActualizados);

      setUsuario((prev) => {
        const actualizado = { ...prev };
        if (actualizado.datos) actualizado.datos.telefono = telefonoLimpio;
        if (actualizado.usuario) actualizado.usuario.telefono = telefonoLimpio;
        actualizado.telefono = telefonoLimpio;
        return actualizado;
      });

      if (contraseñaCambiada) {
        await Swal.fire({
          icon: 'success',
          title: 'Contraseña actualizada',
          text: 'Tu contraseña se actualizó correctamente. Por seguridad, vuelve a iniciar sesión.',
          confirmButtonColor: '#2563eb',
          zIndex: Z_INDEX.SWAL_DIALOG,
        });
        handleCerrarSesion();
      } else {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Teléfono actualizado correctamente',
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
          zIndex: Z_INDEX.SWAL_TOAST,
        });
      }

    } catch (error) {
      console.error("Error al guardar cambios:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error.message || error.response?.data?.message || 'Ocurrió un problema con el servidor.',
        confirmButtonColor: '#2563eb',
        zIndex: Z_INDEX.SWAL_DIALOG,
      });
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrarSesion = async () => {
    const superadminBackup = obtenerSuperadminBackup();

    if (superadminBackup) {
      const response = await apiClient.post('/api/usuario/stop-impersonate');
      eliminarSuperadminBackup();
      eliminarUsuarioImpersonado();
      clearCache();
      setRoleTransition(true);
      setUsuario(response.data?.usuario || superadminBackup);
      navigate('/superadmin_dashboard', { replace: true });
      return;
    }

    try {
      await apiClient.post('/api/usuario/logout');
    } catch {
      // La sesión se limpia localmente aunque la petición de logout falle.
    }
    setUsuario(null);
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="duenio-perfil-loading">
        <p>Cargando sesión segura...</p>
      </div>
    );
  }

  const nombreCompleto = `${personalData.nombre} ${personalData.apellido}`.trim();

  return (
    <div className="duenio-garage-page">
      <HeaderDueñoGarage />

      <main className="duenio-garage-main" ref={mainScopeRef}>
        <div className="duenio-perfil-topbar">
          <div className="animate-dueño-back">
            <button
              className="duenio-back-button"
              onClick={handleVolverConVerificacion}
              aria-label="Volver al panel del dueño"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
          </div>

          <header className="duenio-perfil-titulos">
            <span className="duenio-perfil-kicker">Cuenta</span>
            <h1>{nombreCompleto ? `Perfil de ${nombreCompleto}` : "Mi Perfil"}</h1>
            <span className="duenio-perfil-badge">
              <Warehouse size={14} />
              Dueño de Garage
            </span>
          </header>
        </div>

        <div className="duenio-perfil-statusbar" aria-label="Resumen de tu cuenta">
          <div>
            <span>Rol</span>
            <strong>Dueño de Garage</strong>
          </div>
          <div>
            <span>Garages asociados</span>
            <strong>{cargandoGarages ? "…" : garagesCount}</strong>
          </div>
          <div>
            <span>Estado</span>
            <strong className="is-ok">Cuenta activa</strong>
          </div>
        </div>

        <form onSubmit={handleGuardarCambios} className="duenio-perfil-form" noValidate>
          <section className="duenio-perfil-card">
            <div className="duenio-perfil-card-header">
              <div className="duenio-perfil-card-icon">
                <User size={20} />
              </div>
              <h3>Información Personal</h3>
            </div>

            <div className="duenio-perfil-grid">
              <div className="duenio-perfil-grupo">
                <label htmlFor="nombre">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  className="duenio-perfil-input is-readonly"
                  value={personalData.nombre || ""}
                  readOnly
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="duenio-perfil-grupo">
                <label htmlFor="apellido">Apellido</label>
                <input
                  type="text"
                  id="apellido"
                  className="duenio-perfil-input is-readonly"
                  value={personalData.apellido || ""}
                  readOnly
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="duenio-perfil-grupo duenio-perfil-grupo--full">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  type="email"
                  id="email"
                  className="duenio-perfil-input is-readonly"
                  value={personalData.email || ""}
                  readOnly
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="duenio-perfil-grupo duenio-perfil-grupo--full">
                <label htmlFor="telefono">Teléfono</label>
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  className="duenio-perfil-input"
                  value={telefonoField.value}
                  onChange={telefonoField.onChange}
                  onBlur={telefonoField.onBlur}
                  autoComplete="off"
                />
                <FieldValidation conditions={buildConditions(validationSchema, "telefono", personalData)} isTouched={touched.telefono} />
              </div>
            </div>
          </section>

          <section className="duenio-perfil-card">
            <div className="duenio-perfil-card-header">
              <div className="duenio-perfil-card-icon duenio-perfil-card-icon--rose">
                <Lock size={20} />
              </div>
              <h3>Cambiar Contraseña</h3>
            </div>

            <div className="duenio-perfil-grupo">
              <label htmlFor="contraseña">Nueva Contraseña</label>
              <input
                type="password"
                id="contraseña"
                name="contraseña"
                className="duenio-perfil-input"
                placeholder="8 caracteres, 2 especiales, 2 números y 2 mayúsculas"
                value={contraseñaField.value}
                onChange={contraseñaField.onChange}
                onBlur={contraseñaField.onBlur}
                autoComplete="new-password"
              />
              <FieldValidation conditions={buildConditions(validationSchema, "contraseña", personalData)} isTouched={touched.contraseña} />
            </div>
          </section>

          <div className="duenio-perfil-actions">
            <button type="submit" className="duenio-perfil-btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>

            <button type="button" className="duenio-perfil-btn-danger" onClick={handleCerrarSesion}>
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </form>
      </main>

      <FooterDueñoGarage />
    </div>
  );
}
