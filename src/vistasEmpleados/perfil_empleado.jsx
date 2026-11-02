import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Lock } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Swal from "sweetalert2";
import { Z_INDEX } from "../helpers/zIndex";
import Header from "../componentesEmpleado/header_empleado";
import Footer from "../componentesEmpleado/footer_empleado";

import { useAuth } from "../contexts/useAuth";
import { obtenerSuperadminBackup, eliminarSuperadminBackup, eliminarUsuarioImpersonado } from "../helpers/superadminSession";
import { clearCache } from "../cache/cacheStore";
import apiClient from "../servicies/apiClient";
import { UsuariosGetById } from "../servicies/API_Usuario";
import { VehiculosGetAll } from "../servicies/API_Vehiculo";
import { ModelosGetAll } from "../servicies/API_Modelo";
import { MarcasGetAll } from "../servicies/API_Marca";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";

import FormularioInfoPersonal from "../componentesEmpleado/formulario_info_personal";
import FieldValidation from "../components/FieldValidation";

import "../componentesEmpleado/formulario_PerfilPersonal.css";

gsap.registerPlugin(useGSAP);

export default function PerfilEmpleado() {
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
  const [vehiculos, setVehiculos] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const { isValid, touched, getFieldProps } = useLiveValidation(personalData, validationSchema);
  const telefonoField = getFieldProps("telefono", setPersonalData);
  const contraseñaField = getFieldProps("contraseña", setPersonalData);

  const obtenerIdUsuario = (usr) => usr?.id ?? usr?.id_usuario ?? usr?._id;

  useEffect(() => {
    const haCambiado = 
      personalData.nombre !== originalPersonalData.nombre ||
      personalData.apellido !== originalPersonalData.apellido ||
      personalData.email !== originalPersonalData.email ||
      personalData.telefono !== originalPersonalData.telefono ||
      personalData.contraseña !== originalPersonalData.contraseña;
    
    setIsDirty(haCambiado);
  }, [personalData, originalPersonalData]);

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
          navigate("/empleados_dashboard");
        }
      });
    } else {
      navigate("/empleados_dashboard");
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

  useEffect(() => {
    if (!usuario) return;
    let montado = true;

    const fetchUsuarioCompleto = async () => {
      try {
        const id = Number(obtenerIdUsuario(usuario));
        if (!id) return;
        const res = await UsuariosGetById(id);
        if (!montado) return;
        const userData = res.respuesta ? res.datos : null;
        if (!userData) {
          throw new Error("No se pudo cargar el perfil completo.");
        }
        
        const payload = {
          nombre: userData.nombre || "",
          apellido: userData.apellido || "",
          email: userData.email || "",
          telefono: userData.telefono || ""
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
          telefono: infoUsuario.telefono || usuario.telefono || ""
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
    const idUsuario = Number(obtenerIdUsuario(usuario));
    if (!idUsuario) return;

    const cargarVehiculos = async () => {
      setCargandoVehiculos(true);

      const [resVehiculos, resModelos, resMarcas] = await Promise.all([
        VehiculosGetAll(),
        ModelosGetAll(),
        MarcasGetAll(),
      ]);

      if (!montado) return;

      const normalizarArray = (datos) =>
        Array.isArray(datos) ? datos
          : Array.isArray(datos?.datos) ? datos.datos
          : Array.isArray(datos?.data) ? datos.data
          : [];

      const modelosArr = normalizarArray(resModelos?.datos);
      const marcasArr = normalizarArray(resMarcas?.datos);

      const marcaPorId = new Map(
        marcasArr.map((m) => [Number(m.id), m.nombre || ""])
      );

      const infoModelo = new Map();
      modelosArr.forEach((m) => {
        const id = Number(m.id);
        const nombre = m.nombre || m.nombre_modelo || m.modelo || "";
        const marcaNombre = m.marca?.nombre ?? marcaPorId.get(Number(m.id_marca)) ?? "";
        infoModelo.set(id, { nombre, marcaNombre });
      });

      if (resVehiculos.respuesta) {
        const lista = normalizarArray(resVehiculos.datos);
        const vehiculosUsuario = lista
          .filter((v) =>
            Number(v.id_usuario ?? v.idUsuario ?? v.usuario_id) === idUsuario
          )
          .map((v) => {
            const info = infoModelo.get(Number(v.id_modelo));
            if (info) {
              return { ...v, marca_nombre: info.marcaNombre, modelo_nombre: info.nombre };
            }
            return v;
          });
        setVehiculos(vehiculosUsuario);
      }
      setCargandoVehiculos(false);
    };
    cargarVehiculos();
    return () => { montado = false; };
  }, [usuario]);

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalData((prev) => ({ ...prev, [name]: value }));
  };

  useGSAP(() => {
    if (loading || !usuario) return;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(".animate-back", { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.4 })
      .fromTo(".textosTitulosPerfil", { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.2")
      .fromTo(".formulario-seccion", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, "-=0.3")
      .fromTo(".action-buttons-group", { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.2");
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
          confirmButtonColor: '#3b82f6',
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
          zIndex: Z_INDEX.SWAL_DIALOG,
        });
      }

    } catch (error) {
      console.error("Error al guardar cambios:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: error.message || error.response?.data?.message || 'Ocurrió un problema con el servidor.',
        confirmButtonColor: '#3b82f6',
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
    } catch (err) {}
    setUsuario(null);
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="perfilUsuario-Contenedor" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b", fontWeight: 600, fontFamily: "sans-serif" }}>Cargando sesión segura...</p>
      </div>
    );
  }

  return (
    <div className="Perfil-contenedor">
      <Header/>
      <div className="perfilUsuario-Contenedor" ref={mainScopeRef}>
        <main className="perfilUsuario-contenido">
          
          <div className="top-navigation-bar">
            <div className="animate-back">
              <button
                className="boton-back"
                onClick={handleVolverConVerificacion}
                aria-label="Volver"
                type="button"
              >
                <ArrowLeft size={20} />
              </button>
            </div>
            
            <header className="textosTitulosPerfil">
              <h1>
                {personalData.nombre || personalData.apellido 
                  ? `Perfil de ${personalData.nombre} ${personalData.apellido}`.trim() 
                  : "Mi Perfil"
                }
              </h1>
            </header>
          </div>

          <form onSubmit={handleGuardarCambios} className="perfil-form-wrapper">
            <FormularioInfoPersonal
              data={personalData}
              onChange={handlePersonalChange}
              telefonoFieldValidation={{
                conditions: buildConditions(validationSchema, "telefono", personalData),
                isTouched: touched.telefono,
                inputProps: telefonoField,
              }}
            />

            <section className="formulario-seccion animate-section">
              <div className="form-card-header" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div className="icon-badge-box" style={{ width: "36px", height: "36px", background: "#fff1f2", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={20} style={{ color: "#e11d48" }} />
                </div>
                <h3 className="formulario-subtitulo" style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
                  Cambiar Contraseña
                </h3>
              </div>
              <div className="formulario-grid">
                <div className="formulario-grupo">
                  <label htmlFor="contraseña">Nueva Contraseña</label>
                  <input
                    type="password"
                    id="contraseña"
                    name="contraseña"
                    className="formulario-input"
                    placeholder="8 caracteres, 2 especiales, 2 números y 2 mayúsculas"
                    value={contraseñaField.value}
                    onChange={contraseñaField.onChange}
                    onBlur={contraseñaField.onBlur}
                    autoComplete="new-password"
                  />
                  <FieldValidation conditions={buildConditions(validationSchema, "contraseña", personalData)} isTouched={touched.contraseña} />
                </div>
              </div>
            </section>

            <div className="action-buttons-group">
              <button type="submit" className="btn-primary-action" disabled={guardando}>
                <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>

              <button 
                type="button" 
                className="btn-secondary-action" 
                onClick={handleCerrarSesion}
                style={{ color: '#e11d48', backgroundColor: '#fff1f2' }}
              >
                <LogOut size={18} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </form>
        </main>
      </div>
      <Footer/>
    </div>
  );
}
