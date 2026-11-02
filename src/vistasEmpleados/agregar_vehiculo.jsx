import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Car, Plus } from "lucide-react";
import Swal from "sweetalert2";
import { Z_INDEX } from "../helpers/zIndex";
import Header from "../componentesEmpleado/header_empleado";
import Footer from "../componentesEmpleado/footer_empleado";
import { useAuth } from "../contexts/useAuth";
import { VehiculosCreate } from "../servicies/API_Vehiculo";
import { ModelosGetAll } from "../servicies/API_Modelo";
import { MarcasGetAll } from "../servicies/API_Marca";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";
import FieldValidation from "../components/FieldValidation";
import "../componentesEmpleado/formulario_PerfilPersonal.css";
import "../componentesEmpleado/formulario_vehiculo.css";

const validationSchema = {
  modelo: [
    { rule: (v) => v?.trim().length > 0, message: "Requerido" },
  ],
  patente: [
    { rule: (v) => v?.trim().length > 0, message: "Requerido" },
    { rule: (v) => !v || /^[a-zA-Z0-9]{6,8}$/.test(v?.trim()), message: "6-8 caracteres alfanuméricos (ej: AA123BB)" },
  ],
};

export default function AgregarVehiculo() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [formData, setFormData] = useState({ modelo: "", patente: "", idModelo: "" });
  const [guardando, setGuardando] = useState(false);
  const [modelosGlobales, setModelosGlobales] = useState([]);
  const [marcasLookup, setMarcasLookup] = useState({});
  const [sugerencias, setSugerencias] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const autocompleteRef = useRef(null);

  const { touched } = useLiveValidation(formData, validationSchema);

  useEffect(() => {
    async function cargarCatalogo() {
      try {
        // Ejecutamos ambas llamadas en paralelo para optimizar la velocidad de carga de la pantalla
        const [resultadoModelos, resultadoMarcas] = await Promise.allSettled([
          typeof ModelosGetAll === "function" ? ModelosGetAll() : null,
          typeof MarcasGetAll === "function" ? MarcasGetAll() : null
        ]);

        // 1. Procesamos y guardamos las Marcas en un objeto Indexado por ID para búsquedas O(1)
        let lookupMarcas = {};
        if (resultadoMarcas.status === "fulfilled" && resultadoMarcas.value) {
          const arrayMarcas = resultadoMarcas.value?.datos || resultadoMarcas.value?.data || [];
          if (Array.isArray(arrayMarcas)) {
            arrayMarcas.forEach(m => {
              if (m && m.id) {
                lookupMarcas[m.id] = m.nombre || m.nombre_marca || String(m);
              }
            });
          }
        }
        setMarcasLookup(lookupMarcas);

        // 2. Procesamos y guardamos los Modelos globales
        if (resultadoModelos.status === "fulfilled" && resultadoModelos.value) {
          const arrayModelos = resultadoModelos.value?.datos || [];
          if (Array.isArray(arrayModelos)) {
            setModelosGlobales(arrayModelos);
          } else if (arrayModelos && typeof arrayModelos === "object") {
            const fallback = arrayModelos.data || Object.values(arrayModelos);
            setModelosGlobales(Array.isArray(fallback) ? fallback : []);
          }
        }
      } catch (error) {
        console.error("Error cargando el catálogo de vehículos:", error);
        setModelosGlobales([]);
      }
    }
    cargarCatalogo();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const obtenerIdUsuario = (usr) => usr?.id ?? usr?.id_usuario ?? usr?._id;

  // CORREGIDO: Buscamos el nombre de la marca dinámicamente en nuestro diccionario cruzando el id_marca
  const handleFiltradoModelo = (e) => {
    const valor = e.target.value;
    setFormData((prev) => ({ ...prev, modelo: valor, idModelo: "" }));

    if (valor.trim().length > 0 && modelosGlobales.length > 0) {
      const filtrados = modelosGlobales.filter((item) => {
        if (!item) return false;
        const nombreModelo = item.nombre || item.nombre_modelo || item.modelo || "";
        
        // Obtenemos el ID de marca del modelo (suele venir como id_marca o marca_id)
        const idMarca = item.id_marca || item.marca_id || item.marca;
        const nombreMarca = marcasLookup[idMarca] || "";
        
        const stringDeBusqueda = `${nombreMarca} ${nombreModelo}`.toLowerCase();
        return stringDeBusqueda.includes(valor.toLowerCase());
      });
      setSugerencias(filtrados);
      setMostrarSugerencias(true);
    } else {
      setSugerencias([]);
      setMostrarSugerencias(false);
    }
  };

  // CORREGIDO: Al seleccionar, traemos la marca asociada mediante el ID y seteamos "Marca Modelo" en el input
  const handleSeleccionarItem = (item) => {
    if (!item) return;
    const nombreModelo = item.nombre || item.nombre_modelo || item.modelo || String(item);
    
    const idMarca = item.id_marca || item.marca_id || item.marca;
    const nombreMarca = marcasLookup[idMarca] || "";
    
    const textoCompleto = nombreMarca ? `${nombreMarca} ${nombreModelo}` : nombreModelo;
    
    setFormData((prev) => ({ ...prev, modelo: textoCompleto, idModelo: item.id }));
    setMostrarSugerencias(false);
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    const modeloTrim = formData.modelo?.trim();
    const patenteTrim = formData.patente?.trim();
    if (!modeloTrim || !patenteTrim || !formData.idModelo) {
      Swal.fire({
        icon: "warning",
        title: "Campos incompletos",
        text: "Debes seleccionar un modelo del catálogo y completar la patente.",
        confirmButtonColor: "#3b82f6",
        zIndex: Z_INDEX.SWAL_DIALOG,
      });
      return;
    }

    const subUsuario = usuario?.datos || usuario?.usuario || {};
    const idUsuarioFinal = obtenerIdUsuario(usuario) || subUsuario.id_usuario || subUsuario.id;
    if (!idUsuarioFinal) {
      Swal.fire({
        icon: "error",
        title: "Error de sesión",
        text: "No se pudo detectar el ID del usuario.",
        confirmButtonColor: "#3b82f6",
        zIndex: Z_INDEX.SWAL_DIALOG,
      });
      return;
    }

    try {
      setGuardando(true);
      const response = await VehiculosCreate({
        id_usuario: Number(idUsuarioFinal),
        id_modelo: Number(formData.idModelo),
        patente: patenteTrim.toUpperCase(),
      });
      if (response.respuesta) {
        Swal.fire({
          toast: true,
          position: "top-end",
          icon: "success",
          title: "Vehículo añadido correctamente",
          showConfirmButton: false,
          timer: 2500,
          timerProgressBar: true,
          zIndex: Z_INDEX.SWAL_DIALOG,
        });
        navigate("/empleados_dashboard");
      } else {
        throw new Error("Error al crear el vehículo");
      }
    } catch (error) {
      console.error("Error al añadir vehículo:", error);
      Swal.fire({
        icon: "error",
        title: "Error al añadir vehículo",
        text: error.message || error.response?.data?.message || "Ocurrió un problema con el servidor.",
        confirmButtonColor: "#3b82f6",
        zIndex: Z_INDEX.SWAL_DIALOG,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="Perfil-contenedor">
      <Header />
      <div className="perfilUsuario-Contenedor">
        <main className="perfilUsuario-contenido">
          <div className="top-navigation-bar">
            <button
              className="boton-back"
              onClick={() => navigate("/empleados_dashboard")}
              aria-label="Volver"
              type="button"
            >
              <ArrowLeft size={20} />
            </button>
            <header className="textosTitulosPerfil">
              <h1>Añadir Vehículo</h1>
            </header>
          </div>

          <form onSubmit={handleGuardar} className="perfil-form-wrapper">
            <section className="vehiculo-card-seccion formulario-seccion animate-section">
              <div className="form-card-header" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
                <div className="icon-badge-box" style={{ width: "36px", height: "36px", background: "rgb(239, 246, 255)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Car size={20} style={{ color: "rgb(59, 130, 246)" }} />
                </div>
                <h3 className="formulario-subtitulo" style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>
                  Nuevo Vehículo
                </h3>
              </div>

              <div className="formulario-grid-vehiculo">
                <div className="vehiculo-input-grupo" ref={autocompleteRef} style={{ position: "relative" }}>
                  <label htmlFor="nuevo-modelo">Modelo del Vehículo</label>
                  <input
                    type="text"
                    id="nuevo-modelo"
                    className="formulario-input"
                    value={formData.modelo}
                    onChange={handleFiltradoModelo}
                    onFocus={() => formData.modelo && setMostrarSugerencias(true)}
                    placeholder="Ej. Toyota Corolla"
                    autoComplete="off"
                    required
                  />
                  <FieldValidation conditions={buildConditions(validationSchema, "modelo", formData)} isTouched={touched.modelo} />
                  {mostrarSugerencias && sugerencias.length > 0 && (
                    <ul className="autocomplete-suggestions-panel" style={{ listStyle: "none", padding: 0, margin: 0, position: "absolute", width: "100%", zIndex: 100, background: "#fff", border: "1px solid #cbd5e1", borderRadius: "8px", maxHeight: "200px", overflowY: "auto" }}>
                      {sugerencias.map((item, index) => {
                        if (!item) return null;
                        const textoModelo = item.nombre || item.nombre_modelo || item.modelo || String(item);
                        
                        // Extraemos el id_marca de la relación del modelo y buscamos el string real
                        const idMarca = item.id_marca || item.marca_id || item.marca;
                        const textoMarca = marcasLookup[idMarca] || "";

                        return (
                          <li
                            key={item.id || index}
                            className="autocomplete-item"
                            onClick={() => handleSeleccionarItem(item)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.75rem 1rem",
                              cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9"
                            }}
                          >
                            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: "500", color: "#1e293b" }}>{textoModelo}</span>
                              {textoMarca && (
                                <span style={{
                                  fontSize: "0.75rem",
                                  backgroundColor: "#eff6ff",
                                  color: "#3b82f6",
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: "6px",
                                  fontWeight: "600",
                                  border: "1px solid #dbeafe"
                                }}>
                                  {textoMarca}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="vehiculo-input-grupo">
                  <label htmlFor="nuevo-patente">Matrícula / Patente</label>
                  <input
                    type="text"
                    id="nuevo-patente"
                    className="formulario-input"
                    value={formData.patente}
                    onChange={(e) => setFormData((prev) => ({ ...prev, patente: e.target.value }))}
                    placeholder="Ej. AA123BB"
                    autoComplete="off"
                    required
                  />
                  <FieldValidation conditions={buildConditions(validationSchema, "patente", formData)} isTouched={touched.patente} />
                </div>
              </div>

              <button
                type="submit"
                className="btn-add-vehicle"
                disabled={guardando}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1",
                  backgroundColor: guardando ? "#f1f5f9" : "transparent",
                  color: "#3b82f6",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  cursor: guardando ? "not-allowed" : "pointer",
                  transition: "border-color 0.2s, background-color 0.2s",
                  marginTop: "0.75rem",
                }}
              >
                <Plus size={18} />
                <span>{guardando ? "Guardando..." : "Añadir Vehículo"}</span>
              </button>
            </section>

            <button
              type="button"
              className="btn-secondary-action"
              onClick={() => navigate("/empleados_dashboard")}
            >
              Cancelar
            </button>
          </form>
        </main>
      </div>
      <Footer />
    </div>
  );
}