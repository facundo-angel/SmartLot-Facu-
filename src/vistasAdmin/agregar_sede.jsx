import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./agregar_sede.css";
import Header from "../componentesAdmin/header_admin";
import { EmpresasGetById } from "../servicies/API_Empresa";
import { SEDE_NOMBRE_VALIDATION } from "../helpers/validation";
import { useAuth } from "../contexts/useAuth";
import FormularioSede from "../components/FormularioSede";
import useFormularioSede from "../hooks/useFormularioSede";

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

  const {
    formData,
    setFormData,
    field,
    touched,
    setCoordenadas,
    cargandoEmpresa,
    error,
    loading,
    onGuardar,
    onCancelar,
    onVolver,
  } = useFormularioSede({
    validationSchema,
    initialFormData: { nombre: "", descripcion: "", ubicacion: "" },
    cargarEmpresa: async () => {
      if (!usuario?.id_empresa) return null;
      const res = await EmpresasGetById(Number(usuario.id_empresa));
      return res.respuesta ? res.datos : null;
    },
    procesarEmpresa: (datos) => {
      const emp = Array.isArray(datos) ? datos[0] : datos;
      setEmpresaNombre(emp?.nombre || "");
    },
    dependenciasCargaEmpresa: [usuario?.id_empresa],
    validarAntesDeGuardar: () =>
      usuario?.id_empresa ? null : "Tu usuario no tiene una empresa asociada.",
    obtenerIdEmpresa: () => Number(usuario.id_empresa),
    alGuardar: () => navigate("/gestion_sedes", { replace: true }),
    alCancelar: () => navigate("/gestion_sedes", { replace: true }),
    alVolver: () => navigate("/gestion_sedes"),
  });

  return (
    <div className="agregar-sede-admin">
      <Header />
      <main className="agregar-sede-admin-main">
        <div className="agregar-sede-admin-top">
          <button className="boton-back-agregar" onClick={onVolver} aria-label="Volver a gestión de sedes">
            <ArrowLeft size={20} />
          </button>
          <div>
            <p>PANEL DE ADMINISTRACIÓN</p>
            <h1>Agregar Sede</h1>
          </div>
        </div>

        {cargandoEmpresa ? (
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
            onGuardar={onGuardar}
            onCancelar={onCancelar}
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
