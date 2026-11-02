import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import FormularioInfoPersonal from "../componentesAdmin/formulario_infoPersonal";
import Header from "../componentesAdmin/header_admin";
import "./agregar_admin_sede.css"
import { CircleCheck } from 'lucide-react';
import BotonGenerico from "../componentesAdmin/boton_generico";
import { UsuariosCreate } from "../servicies/API_Usuario";
import { SedesGetById } from "../servicies/API_Sede";
import useLiveValidation from "../hooks/useLiveValidation";
import { buildConditions } from "../helpers/validation";

function AgregarAdminSede() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();

  const sedeId = location.state?.sedeId;
  const sedeNombre = location.state?.sedeNombre || '';

  const [sedeActual, setSedeActual] = useState(sedeId ? { id: Number(sedeId), nombre: sedeNombre } : null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    contraseña: '',
    id_sede: sedeId ? Number(sedeId) : '',
    id_empresa: usuario?.id_empresa ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sedeId) {
      navigate('/gestion_sedes', { replace: true });
    }
  }, [sedeId, navigate]);

  useEffect(() => {
    if (!sedeId || sedeNombre) return;
    let mounted = true;

    const fetchSede = async () => {
      const res = await SedesGetById(Number(sedeId));
      if (mounted && res.respuesta) {
        const sede = Array.isArray(res.datos) ? res.datos[0] : res.datos;
        setSedeActual((prev) => ({ id: Number(sedeId), nombre: sede?.nombre || prev?.nombre || 'Sede' }));
      }
    };

    fetchSede();
    return () => { mounted = false; };
  }, [sedeId, sedeNombre]);

  const getSchema = () => ({
    nombre: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 2, message: 'Mínimo 2 caracteres' },
      { rule: (v) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(v), message: 'Solo letras' },
    ],
    apellido: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.trim().length >= 2, message: 'Mínimo 2 caracteres' },
      { rule: (v) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/.test(v), message: 'Solo letras' },
    ],
    email: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: 'Email inválido' },
    ],
    contraseña: [
      { rule: (v) => v?.trim().length > 0, message: 'Requerido' },
      { rule: (v) => v?.length >= 8, message: 'Mínimo 8 caracteres' },
      { rule: (v) => (v?.match(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/g) || []).length >= 2, message: 'Mínimo 2 caracteres especiales' },
      { rule: (v) => (v?.match(/\d/g) || []).length >= 2, message: 'Mínimo 2 números' },
      { rule: (v) => (v?.match(/[A-Z]/g) || []).length >= 2, message: 'Mínimo 2 mayúsculas' },
    ],
    telefono: [
      { rule: (v) => !v || v.trim().length === 0 || /^[+]{0,1}[0-9\s-()]+$/.test(v.trim()), message: 'Solo números, espacios, guiones, +, ()' },
      { rule: (v) => !v || v.trim().length === 0 || v.trim().replace(/\D/g, '').length >= 7, message: 'Mínimo 7 dígitos' },
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

  const handleChangeWithTouchWrapper = (field, value) => {
    handleChangeWithTouch(field, value, setFormData);
  };

  const handleGuardarAdmin = async () => {
    setError('');

    if (!isValid) return;
    if (!formData.id_empresa || !formData.id_sede) {
      setError('No se detectó la sede o la empresa para el nuevo administrador. Volvé a la gestión de sedes e intentá de nuevo.');
      return;
    }

    setLoading(true);

    const response = await UsuariosCreate({
      id_rol: 1,
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      email: formData.email.trim(),
      telefono: formData.telefono.trim(),
      contraseña: formData.contraseña,
      id_empresa: Number(formData.id_empresa),
      id_sede: Number(formData.id_sede),
    });

    if (response.respuesta) {
      navigate('/gestion_sedes', { replace: true });
    } else {
      setLoading(false);
      setError(response.datos?.message || 'No se pudo guardar el administrador. Verifica los datos e intenta de nuevo.');
    }
  };

  if (!sedeId) return null;

  const sedes = sedeActual ? [sedeActual] : [];

  return (
    <div className="agregar-admin-sede-page">
      <Header />
      <div className="titulo-agregar-admin-sede">
        <h3>Agregar Administrador de Sede</h3>
        <p>{sedeNombre ? `Nuevo administrador para la sede "${sedeNombre}"` : 'Configuración de un administrador para una sede específica'}</p>
      </div>

      <main className="contenido-agregar-admin-sede">
        <FormularioInfoPersonal
          infoPersonalTitulo="Información Personal"
          labels={{
            nombre: 'Nombre',
            apellido: 'Apellido',
            email: 'Correo electrónico',
            telefono: 'Número de teléfono',
            contraseña: 'Contraseña',
            sede: 'Sede',
          }}
          formData={formData}
          onChange={handleChangeWithTouchWrapper}
          sedes={sedes}
          isSedeDisabled
          fieldsValidation={fieldsValidation}
        />

        {error && <p className="form-error-admin-sede">{error}</p>}

        <div className="form-actions-admin-sede">
          <BotonGenerico
            onClick={handleGuardarAdmin}
            disabled={loading}
            className="btn-guardar-admin-sede"
          >
            <CircleCheck size={20} color="white" />
            <span>{loading ? 'Guardando...' : 'Guardar administrador'}</span>
          </BotonGenerico>

          <BotonGenerico
            onClick={() => navigate('/gestion_sedes', { replace: true })}
            className="btn-cancelar-admin-sede"
          >
            <span>Cancelar</span>
          </BotonGenerico>
        </div>
      </main>
    </div>
  );
}

export default AgregarAdminSede;
