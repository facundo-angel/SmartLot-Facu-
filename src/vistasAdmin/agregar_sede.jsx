import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./agregar_sede.css";
import Header from "../componentesAdmin/header_admin";
import { SedesCreate } from "../servicies/API_Sede";
import { EmpresasGetById } from "../servicies/API_Empresa";
import useLiveValidation from "../hooks/useLiveValidation";
import { SEDE_NOMBRE_VALIDATION } from "../helpers/validation";
import { useAuth } from "../contexts/useAuth";
import FormularioSede from "../components/FormularioSede";

const validationSchema = SEDE_NOMBRE_VALIDATION;

const CLASES_FORMULARIO = {
  form: "agregar-sede-admin-form",
  inputGroup: "input-group-sede-admin",
  error: "form-error-sede-admin",
  actions: "agregar-sede-admin-actions",
  saveButton: "btn-guardar-sede",
  cancelButton: "btn-cancelar-sede",
};

const AgregarSedeAdminSkeleton = () => (
  <section className="agregar-sede-admin-form agregar-sede-admin-form-skeleton" aria-label="Cargando formulario">
    {Array.from({ length: 4 }).map((_, index) => (
      <div className="input-sede-admin-skeleton" key={index}>
        <span className="skl-line skl-form-label" />
        <span className={`skl-line ${index === 2 ? "skl-form-textarea" : "skl-form-control"}`} />
      </div>
    ))}
    <div className="agregar-sede-admin-actions">
      <span className="skl-line skl-form-button" />
      <span className="skl-line skl-form-button secondary" />
    </div>
  </section>
);

function AgregarSedeAdmin() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [empresaNombre, setEmpresaNombre] = useState("");
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    ubicacion: "",
  });
  const [coordenadas, setCoordenadas] = useState({ lat: null, lng: null, direccion: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { isValid, touched, getFieldProps } = useLiveValidation(formData, validationSchema);
  const field = (name) => getFieldProps(name, setFormData);

  useEffect(() => {
    let mounted = true;

    const fetchEmpresa = async () => {
      setLoadingEmpresa(true);
      try {
        if (!usuario?.id_empresa) return;
        const res = await EmpresasGetById(Number(usuario.id_empresa));
        if (!mounted) return;
        if (res.respuesta) {
          const emp = Array.isArray(res.datos) ? res.datos[0] : res.datos;
          setEmpresaNombre(emp?.nombre || "");
        }
      } finally {
        if (mounted) setLoadingEmpresa(false);
      }
    };

    fetchEmpresa();
    return () => { mounted = false; };
  }, [usuario?.id_empresa]);

  const handleGuardar = async () => {
    setError("");

    if (!isValid) return;
    if (!usuario?.id_empresa) {
      setError("Tu usuario no tiene una empresa asociada.");
      return;
    }

    setLoading(true);

    const response = await SedesCreate({
      id_empresa: Number(usuario.id_empresa),
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      ubicacion: formData.ubicacion.trim(),
      latitud: coordenadas.lat,
      longitud: coordenadas.lng,
    });

    if (response.respuesta) {
      navigate("/gestion_sedes", { replace: true });
    } else {
      setLoading(false);
      setError(response.datos?.message || "Error al crear la sede.");
    }
  };

  return (
    <div className="agregar-sede-admin">
      <Header />
      <main className="agregar-sede-admin-main">
        <div className="agregar-sede-admin-top">
          <button className="boton-back-agregar" onClick={() => navigate("/gestion_sedes")} aria-label="Volver a gestión de sedes">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p>PANEL DE ADMINISTRACIÓN</p>
            <h1>Agregar Sede</h1>
          </div>
        </div>

        {loadingEmpresa ? (
          <AgregarSedeAdminSkeleton />
        ) : (
          <FormularioSede
            formData={formData}
            setFormData={setFormData}
            validationSchema={validationSchema}
            field={field}
            touched={touched}
            empresaField={(
              <div className="input-group-sede-admin">
                <label>Empresa</label>
                <div className="empresa-fija-admin">{empresaNombre || "—"}</div>
              </div>
            )}
            onCoordenadasChange={setCoordenadas}
            onGuardar={handleGuardar}
            onCancelar={() => navigate("/gestion_sedes", { replace: true })}
            loading={loading}
            error={error}
            classNames={CLASES_FORMULARIO}
          />
        )}
      </main>
    </div>
  );
}

export default AgregarSedeAdmin;
