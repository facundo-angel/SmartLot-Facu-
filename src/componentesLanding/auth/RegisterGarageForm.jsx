import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Warehouse } from "lucide-react";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/useAuth";
import { getUserHomeRoute } from "../../helpers/roles";
import useLiveValidation from "../../hooks/useLiveValidation";
import { buildConditions } from "../../helpers/validation";
import RegisterField from "./RegisterField";

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOLO_DIGITOS = /^\d{7,15}$/;
const ESPECIALES_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/g;

export default function RegisterGarageForm() {
  const navigate = useNavigate();
  const { setUsuario } = useAuth();
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    contraseña: "",
    confirmar: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const getSchema = () => ({
    nombre: [
      { rule: (v) => v?.trim().length > 0, message: "Requerido" },
      { rule: (v) => v?.trim().length >= 2, message: "Mínimo 2 caracteres" },
      { rule: (v) => SOLO_LETRAS.test(v?.trim()), message: "Solo letras" },
    ],
    apellido: [
      { rule: (v) => v?.trim().length > 0, message: "Requerido" },
      { rule: (v) => v?.trim().length >= 2, message: "Mínimo 2 caracteres" },
      { rule: (v) => SOLO_LETRAS.test(v?.trim()), message: "Solo letras" },
    ],
    email: [
      { rule: (v) => v?.trim().length > 0, message: "Requerido" },
      { rule: (v) => EMAIL_REGEX.test(v?.trim()), message: "Email inválido" },
    ],
    telefono: [
      {
        rule: (v) => !v || v.trim().length === 0 || SOLO_DIGITOS.test(v.trim()),
        message: "Solo números, de 7 a 15 dígitos",
      },
    ],
    contraseña: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
      { rule: (v) => v?.length >= 8, message: "Mínimo 8 caracteres" },
      {
        rule: (v) => (v?.match(ESPECIALES_REGEX) || []).length >= 2,
        message: "Mínimo 2 caracteres especiales",
      },
      { rule: (v) => (v?.match(/\d/g) || []).length >= 2, message: "Mínimo 2 números" },
      { rule: (v) => (v?.match(/[A-Z]/g) || []).length >= 2, message: "Mínimo 2 mayúsculas" },
    ],
    confirmar: [
      { rule: (v) => v?.length > 0, message: "Requerido" },
      { rule: (v) => v === formData.contraseña, message: "Las contraseñas no coinciden" },
    ],
  });

  const { isValid, touched, touchAll, getFieldProps } = useLiveValidation(formData, getSchema());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!isValid) {
      touchAll();
      setError("Revisá los campos marcados.");
      return;
    }
    if (cooldown > 0) {
      setError(`Espere ${cooldown}s antes de reintentar.`);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post(
        "/api/usuario/register-dueno-garage",
        {
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: formData.email.trim().toLowerCase(),
          telefono: formData.telefono.trim() === "" ? null : formData.telefono.trim(),
          contraseña: formData.contraseña,
        },
        { _skipAuthRedirect: true, _skipToast: true }
      );
      const usuario = res.data?.usuario;
      if (!usuario) {
        navigate("/login", { replace: true });
        return;
      }
      setUsuario(usuario);
      navigate(getUserHomeRoute(usuario), { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || "Error de conexión.";
      setError(msg);
      if (err.response?.status === 429) {
        const retryAfter = parseInt(err.response?.headers?.["retry-after"] || "900", 10);
        setCooldown(retryAfter);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="auth-stagger flex gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
        <Warehouse size={22} className="text-brand-blue shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-brand-muted leading-relaxed">
          Después de registrarte vas a poder <strong className="text-brand-warm">crear tu garage</strong> y
          empezar a recibir solicitudes de empresas.
        </p>
      </div>

      <div className="auth-stagger flex items-center gap-2 mt-1">
        <User size={16} className="text-brand-blue" aria-hidden="true" />
        <h3 className="font-display font-bold text-brand-warm">Tus datos</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RegisterField
          id="reg-gar-nombre"
          label="Nombre"
          autoComplete="given-name"
          {...getFieldProps("nombre", setFormData)}
          conditions={buildConditions(getSchema(), "nombre", formData)}
          isTouched={touched.nombre}
        />
        <RegisterField
          id="reg-gar-apellido"
          label="Apellido"
          autoComplete="family-name"
          {...getFieldProps("apellido", setFormData)}
          conditions={buildConditions(getSchema(), "apellido", formData)}
          isTouched={touched.apellido}
        />
      </div>

      <RegisterField
        id="reg-gar-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...getFieldProps("email", setFormData)}
        conditions={buildConditions(getSchema(), "email", formData)}
        isTouched={touched.email}
      />

      <RegisterField
        id="reg-gar-telefono"
        label="Teléfono (opcional)"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        {...getFieldProps("telefono", setFormData)}
        conditions={buildConditions(getSchema(), "telefono", formData)}
        isTouched={touched.telefono}
      />

      <RegisterField
        id="reg-gar-contraseña"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        {...getFieldProps("contraseña", setFormData)}
        conditions={buildConditions(getSchema(), "contraseña", formData)}
        isTouched={touched.contraseña}
      />

      <RegisterField
        id="reg-gar-confirmar"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        {...getFieldProps("confirmar", setFormData)}
        conditions={buildConditions(getSchema(), "confirmar", formData)}
        isTouched={touched.confirmar}
      />

      <button
        type="submit"
        disabled={loading || cooldown > 0}
        className="auth-stagger mt-2 w-full rounded-xl bg-brand-blue px-8 py-4 text-white font-bold text-lg shadow-lg shadow-brand-blue/20 transition-all duration-300 hover:bg-brand-deep hover:shadow-brand-deep/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {cooldown > 0 ? `Espere ${cooldown}s` : loading ? "Creando cuenta..." : "Crear mi cuenta"}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-1 text-center" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
