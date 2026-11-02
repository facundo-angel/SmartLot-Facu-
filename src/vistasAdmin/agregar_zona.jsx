import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./agregar_zona.css";
import Header from "../componentesSuperadmin/header_superadmin";
import { UsuariosGetAll } from "../servicies/API_Usuario";
import { CirclePlus, ArrowLeft } from "lucide-react";
import FormularioZona from "../componentesAdmin/formulario_zona";
import FormularioCapacidad from "../componentesAdmin/formulario_capacidad";
import BotonGenerico from "../componentesAdmin/boton_generico";
import { GaragesCreate } from "../servicies/API_Garage";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";
import FormularioPreciosGarage from "../componentesCompartidos/FormularioPreciosGarage";
import { buildGaragePricesPayload } from "../helpers/prices";

function AgregarZona() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    piso: "",
    ubicacion: "",
    hora_apertura: "",
    hora_cierre: "",
    capacidad_reservas: "",
    capacidad_para_no_reservas: "",
    dias: [], precio_pickup: "", precio_auto: "", precio_moto: ""
  });
  const [coordenadas, setCoordenadas] = useState({ lat: null, lng: null, direccion: '' });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState("");
  const [idDueno, setIdDueno] = useState("");
  const [idGaragistas, setIdGaragistas] = useState([]);
  const [estado, setEstado] = useState(true);
  const [intentoUsuarios, setIntentoUsuarios] = useState(0);

  const cargarUsuarios = () => {
    setCargandoUsuarios(true);
    setErrorUsuarios("");
    setIntentoUsuarios(actual => actual + 1);
  };
  useEffect(() => {
    let activo = true;
    UsuariosGetAll({ force: true }).then(response => {
      if (!activo) return;
      if (!response.respuesta || !Array.isArray(response.datos)) throw new Error();
      setUsuarios(response.datos.filter(usuario => !usuario.Borrado));
    }).catch(() => {
      if (activo) setErrorUsuarios("No se pudieron cargar los usuarios. Volvé a intentar.");
    }).finally(() => { if (activo) setCargandoUsuarios(false); });
    return () => { activo = false; };
  }, [intentoUsuarios]);
  const duenos = usuarios.filter(usuario => usuario.tipo_rol?.trim().toLowerCase() === 'dueño_garage');
  const garagistas = usuarios.filter(usuario => usuario.tipo_rol?.trim().toLowerCase() === 'garagista');
  const nombreUsuario = usuario => `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() + ` (${usuario.email || '#' + usuario.id})`;

  const getSchema = () => ({
    nombre: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 3, message: 'Mínimo 3 caracteres' },
    ],
    piso: [
      { rule: (v) => v !== '' && v !== null && v !== undefined, message: 'Requerido' },
      { rule: (v) => v === '' || v === null || v === undefined || (!isNaN(Number(v)) && Number.isInteger(Number(v))), message: 'Debe ser número entero' },
    ],
    ubicacion: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 5, message: 'Mínimo 5 caracteres' },
      () => ({ rule: () => coordenadas.lat !== null && coordenadas.lng !== null, message: 'Selecciona una ubicación válida del mapa' }),
    ],
    hora_apertura: [
      { rule: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')), message: 'Formato HH:MM requerido' },
    ],
    hora_cierre: [
      { rule: (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v || '')), message: 'Formato HH:MM requerido' },
      () => ({ rule: () => !formData.hora_apertura || !formData.hora_cierre || formData.hora_apertura < formData.hora_cierre, message: 'Apertura debe ser anterior a cierre' }),
    ],
    capacidad_reservas: [
      { rule: (v) => v !== '' && v !== null && v !== undefined, message: 'Requerido' },
      { rule: (v) => v === '' || v === null || v === undefined || (!isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) >= 0), message: 'Número entero ≥ 0' },
    ],
    capacidad_para_no_reservas: [
      { rule: (v) => v !== '' && v !== null && v !== undefined, message: 'Requerido' },
      { rule: (v) => v === '' || v === null || v === undefined || (!isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) >= 0), message: 'Número entero ≥ 0' },
    ],
    dias: [
      { rule: (v) => Array.isArray(v) && v.length > 0, message: 'Selecciona al menos un día' },
    ],
  });

  const { isValid, touched, handleChangeWithTouch } = useLiveValidation(formData, getSchema());

  const fieldsValidation = {};
  Object.keys(getSchema()).forEach((field) => {
    fieldsValidation[field] = {
      conditions: buildConditions(getSchema(), field, formData),
      isTouched: touched[field],
    };
  });

  const handleChange = (field, value) => {
    if (typeof field === "object" && field !== null) {
      setFormData(field);
    } else {
      handleChangeWithTouch(field, value, setFormData);
    }
  };

  const handleCrearZona = async () => {
    if (loading) return;
    setError("");

    if (cargandoUsuarios || errorUsuarios || !idDueno) {
      setError("Seleccioná un dueño antes de crear el garage.");
      return;
    }

    if (!isValid) {
      setError("❌ Corrige los errores antes de guardar.");
      return;
    }

    const capRes = Number(formData.capacidad_reservas);
    const capNoRes = Number(formData.capacidad_para_no_reservas);
    const cap = capRes + capNoRes;
    if (cap <= 0) { setError("La capacidad total debe ser mayor que cero."); return; }

    let precios;
    try { precios = buildGaragePricesPayload(formData); }
    catch (validationError) { setError(validationError.message); return; }

    setLoading(true);

    const garage = {
      nombre: formData.nombre.trim(),
      piso: String(formData.piso).trim(),
      ubicacion: formData.ubicacion.trim(),
      latitud: coordenadas.lat,
      longitud: coordenadas.lng,
      hora_apertura: formData.hora_apertura,
      hora_cierre: formData.hora_cierre,
      estado,
      id_dueno: Number(idDueno),
      id_garagistas: idGaragistas,
      capacidad: cap,
      capacidad_para_no_reservas: capNoRes,
      capacidad_reservas: capRes,
      ocupacion_reservas: 0,
      ocupacion_no_reservas: 0,
      dias: formData.dias,
      ...precios
    };

    const response = await GaragesCreate(garage);
    setLoading(false);

    if (response.respuesta) {
      navigate("/superadmin/gestion_garages", { replace: true });
    } else {
      const errorMsg = response.datos?.message || response.datos || 'Error desconocido al conectar con la BD.';
      setError(`❌ Error al crear garage: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`);
    }
  };

  return (
    <div className="agregar-zona">
      <Header />

      <div className="contenido-agregar-zona">
        <div className="top-garage">
          <button className="boton-back" onClick={() => navigate("/superadmin/gestion_garages", { replace: true })}>
            <ArrowLeft size={24} />
          </button>

          <div className="info-top">
            <p>AGREGAR GARAGE</p>
            <h1>Nuevo Garage</h1>
            <span>Configura los detalles de la nueva zona de estacionamiento.</span>
          </div>
        </div>

        <div className="form-garage">
          <fieldset className="garage-responsables" disabled={loading || cargandoUsuarios}>
            <legend>Dueño y personal</legend>
            {cargandoUsuarios && <p role="status">Cargando usuarios...</p>}
            {errorUsuarios && <p role="alert">{errorUsuarios} <button type="button" onClick={cargarUsuarios}>Reintentar</button></p>}
            <label htmlFor="garage-dueno">Dueño del garage *</label>
            <select id="garage-dueno" value={idDueno} onChange={event => setIdDueno(event.target.value)} required>
              <option value="">Seleccionar dueño</option>
              {duenos.map(usuario => <option key={usuario.id} value={usuario.id}>{nombreUsuario(usuario)}</option>)}
            </select>
            {!cargandoUsuarios && !errorUsuarios && duenos.length === 0 && <p>No hay dueños registrados. Creá un usuario con el rol dueño de garage para continuar.</p>}
            <p id="garagistas-ayuda">Garagistas (opcional). Podés seleccionar varios o crear el garage sin garagistas.</p>
            <div className="garage-personal-lista" role="group" aria-label="Garagistas" aria-describedby="garagistas-ayuda">
              {garagistas.map(usuario => <label key={usuario.id}>
                <input type="checkbox" checked={idGaragistas.includes(Number(usuario.id))}
                  onChange={event => setIdGaragistas(actual => event.target.checked ? [...actual, Number(usuario.id)] : actual.filter(id => id !== Number(usuario.id)))} />
                <span>{nombreUsuario(usuario)}</span>
              </label>)}
            </div>
            {!cargandoUsuarios && !errorUsuarios && garagistas.length === 0 && <p>No hay garagistas registrados. Podés agregarlos más adelante.</p>}
          </fieldset>
          <fieldset className="garage-responsables" disabled={loading}>
            <legend>Estado inicial</legend>
            <label htmlFor="garage-estado">Estado del garage</label>
            <select id="garage-estado" value={String(estado)} onChange={event => setEstado(event.target.value === 'true')}>
              <option value="true">Abierto</option>
              <option value="false">Cerrado</option>
            </select>
          </fieldset>
          <FormularioZona
            formData={formData}
            onChange={handleChange}
            hideSede
            fieldsValidation={fieldsValidation}
            onCoordenadasChange={setCoordenadas}
          />

          <FormularioCapacidad
            formData={formData}
            onChange={handleChange}
          />
          <FormularioPreciosGarage values={formData} onChange={handleChange} disabled={loading} />
        </div>

        {error && <p className="form-error" style={{ color: '#d32f2f', padding: '12px', marginBottom: '16px', backgroundColor: '#ffebee', borderRadius: '4px', fontWeight: 'bold' }}>{error}</p>}

        <div className="acciones-garage">
          <BotonGenerico
            className="btn-guardar-grande"
            onClick={handleCrearZona}
            disabled={loading || cargandoUsuarios || Boolean(errorUsuarios) || !idDueno}
          >
            <CirclePlus size={22} />
            <span>{loading ? "Creando..." : "Crear Garage"}</span>
          </BotonGenerico>

          <BotonGenerico
            className="btn-cancelar-grande"
            onClick={() => navigate("/superadmin/gestion_garages", { replace: true })}
          >
            <span>Cancelar</span>
          </BotonGenerico>
        </div>
      </div>
    </div>
  );
}

export default AgregarZona;
