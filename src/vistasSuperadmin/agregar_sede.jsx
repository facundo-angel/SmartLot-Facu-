import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./agregar_sede.css";
import HeaderSuperadmin from "../componentesSuperadmin/header_superadmin";
import { EmpresasGetAll } from "../servicies/API_Empresa";
import { SEDE_NOMBRE_VALIDATION } from "../helpers/validation";
import FormularioSede from "../components/FormularioSede";
import useFormularioSede from "../hooks/useFormularioSede";

const validationSchema = {
  idEmpresa: [
    { rule: (v) => v !== "", message: "Selecciona una empresa" },
  ],
  ...SEDE_NOMBRE_VALIDATION,
};

const CLASES_FORMULARIO = {
  form: "agregar-sede-form",
  inputGroup: "input-group-superadmin",
  error: "form-error-superadmin",
  actions: "agregar-sede-actions",
  saveButton: "btn-guardar-grande",
  cancelButton: "btn-cancelar-grande",
};

const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  return [];
};

const AgregarSedeSkeleton = () => (
  <section className="agregar-sede-form agregar-sede-form-skeleton" aria-label="Cargando formulario">
    {Array.from({ length: 4 }).map((_, index) => (
      <div className="input-skeleton-superadmin" key={index}>
        <span className="skeleton-line skeleton-form-label" />
        <span className={`skeleton-line ${index === 2 ? "skeleton-form-textarea" : "skeleton-form-control"}`} />
      </div>
    ))}
    <div className="agregar-sede-actions">
      <span className="skeleton-line skeleton-form-button" />
      <span className="skeleton-line skeleton-form-button secondary" />
    </div>
  </section>
);

function AgregarSede() {
  const navigate = useNavigate();
  const location = useLocation();
  const [empresas, setEmpresas] = useState([]);

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
    initialFormData: {
      idEmpresa: location.state?.empresaId ? String(location.state.empresaId) : "",
      nombre: "",
      descripcion: "",
      ubicacion: "",
    },
    cargarEmpresa: async () => {
      const res = await EmpresasGetAll();
      return res.respuesta ? obtenerListado(res.datos) : null;
    },
    procesarEmpresa: (lista) => setEmpresas(lista),
    dependenciasCargaEmpresa: [],
    obtenerIdEmpresa: ({ formData }) => Number(formData.idEmpresa),
    alGuardar: ({ formData }) => navigate("/superadmin/gestion_empresas", {
      replace: true,
      state: { empresaId: Number(formData.idEmpresa) },
    }),
    alCancelar: ({ formData }) => navigate("/superadmin/gestion_empresas", {
      replace: true,
      state: { empresaId: Number(formData.idEmpresa) || undefined },
    }),
    alVolver: ({ formData }) => navigate("/superadmin/gestion_empresas", {
      state: { empresaId: Number(formData.idEmpresa) || undefined },
    }),
  });

  return (
    <div className="agregar-sede-page">
      <HeaderSuperadmin />
      <main className="agregar-sede-main">
        <div className="agregar-sede-top">
          <button className="boton-back" onClick={onVolver}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <p>SUPERADMIN</p>
            <h1>Agregar Sede</h1>
          </div>
        </div>

        {cargandoEmpresa ? (
          <AgregarSedeSkeleton />
        ) : (
          <FormularioSede
            formData={formData}
            setFormData={setFormData}
            validationSchema={validationSchema}
            field={field}
            touched={touched}
            empresaField={(
              <div className="input-group-superadmin">
                <label>Empresa</label>
                <select value={formData.idEmpresa} onChange={(e) => setFormData((prev) => ({ ...prev, idEmpresa: e.target.value }))} autoComplete="off" required>
                  <option value="">Seleccionar empresa...</option>
                  {empresas.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            onCoordenadasChange={setCoordenadas}
            onGuardar={onGuardar}
            onCancelar={onCancelar}
            loading={loading}
            error={error}
            classNames={CLASES_FORMULARIO}
            cancelButtonStyle={{ backgroundColor: "grey" }}
          />
        )}
      </main>
    </div>
  );
}

export default AgregarSede;
