import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CircleCheck, User } from "lucide-react";
import apiClient from "../../api/client";
import useLiveValidation from "../../hooks/useLiveValidation";
import { buildConditions } from "../../helpers/validation";
import RegisterField from "./RegisterField";

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SOLO_DIGITOS = /^\d{7,15}$/;
const ESPECIALES_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/g;

export default function RegisterEmpresaForm() {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    contraseña: "",
    confirmar: "",
    empresa_nombre: "",
    empresa_descripcion: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [enviado, setEnviado] = useState(false);

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
    empresa_nombre: [
      { rule: (v) => v?.trim().length > 0, message: "Requerido" },
      { rule: (v) => v?.trim().length >= 2, message: "Mínimo 2 caracteres" },
    ],
    empresa_descripcion: [
      { rule: (v) => !v || v.trim().length <= 1000, message: "Máximo 1000 caracteres" },
    ],
  });

  const { errors, isValid, touched, touchAll, getFieldProps } = useLiveValidation(
    formData,
    getSchema()
  );

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
      const emailNormalizado = formData.email.trim().toLowerCase();
      await apiClient.post(
        "/api/solicitud-registro",
        {
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: emailNormalizado,
          telefono: formData.telefono.trim() === "" ? null : formData.telefono.trim(),
          contraseña: formData.contraseña,
          empresa_nombre: formData.empresa_nombre.trim(),
          empresa_descripcion:
            formData.empresa_descripcion.trim() === ""
              ? null
              : formData.empresa_descripcion.trim(),
        },
        { _skipAuthRedirect: true, _skipToast: true }
      );
      setEnviado(true);
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

  if (enviado) {
    return (
      <div className="flex flex-col items-center text-center gap-4 py-6" aria-live="polite">
        <span className="register-success-pop flex items-center justify-center w-20 h-20 rounded-full bg-green-50 border border-green-200">
          <CircleCheck size={44} className="text-green-600" aria-hidden="true" />
        </span>
        <h2 className="font-display text-2xl font-extrabold text-brand-warm">
          Recibimos tu solicitud.
        </h2>
        <p className="text-brand-muted text-sm md:text-base leading-relaxed max-w-sm">
          Si corresponde procesarla, te contactaremos por correo. Si ya tenés una cuenta,
          podés iniciar sesión o recuperar tu contraseña.
        </p>
        <Link
          to="/login"
          className="mt-2 font-semibold text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue rounded"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="auth-stagger flex items-center gap-2 mt-1">
        <User size={16} className="text-brand-blue" aria-hidden="true" />
        <h3 className="font-display font-bold text-brand-warm">Tus datos</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RegisterField
          id="reg-emp-nombre"
          label="Nombre"
          autoComplete="given-name"
          {...getFieldProps("nombre", setFormData)}
          conditions={buildConditions(getSchema(), "nombre", formData)}
          isTouched={touched.nombre}
        />
        <RegisterField
          id="reg-emp-apellido"
          label="Apellido"
          autoComplete="family-name"
          {...getFieldProps("apellido", setFormData)}
          conditions={buildConditions(getSchema(), "apellido", formData)}
          isTouched={touched.apellido}
        />
      </div>

      <RegisterField
        id="reg-emp-email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        {...getFieldProps("email", setFormData)}
        conditions={buildConditions(getSchema(), "email", formData)}
        isTouched={touched.email}
      />

      <RegisterField
        id="reg-emp-telefono"
        label="Teléfono (opcional)"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
          {...getFieldProps("telefono", setFormData)}
          conditions={buildConditions(getSchema(), "telefono", formData)}
          isTouched={touched.telefono}
        />

      <RegisterField
        id="reg-emp-contraseña"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        {...getFieldProps("contraseña", setFormData)}
        conditions={buildConditions(getSchema(), "contraseña", formData)}
        isTouched={touched.contraseña}
      />

      <RegisterField
        id="reg-emp-confirmar"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        {...getFieldProps("confirmar", setFormData)}
        conditions={buildConditions(getSchema(), "confirmar", formData)}
        isTouched={touched.confirmar}
      />

      <div className="auth-stagger flex items-center gap-2 mt-2">
        <Building2 size={16} className="text-brand-blue" aria-hidden="true" />
        <h3 className="font-display font-bold text-brand-warm">Datos de tu empresa</h3>
      </div>

      <RegisterField
        id="reg-emp-empresa-nombre"
        label="Nombre de la empresa"
        autoComplete="organization"
        {...getFieldProps("empresa_nombre", setFormData)}
        conditions={buildConditions(getSchema(), "empresa_nombre", formData)}
        isTouched={touched.empresa_nombre}
      />

      <RegisterField
        id="reg-emp-empresa-descripcion"
        label="Descripción (opcional)"
        textarea
        rows={3}
        placeholder="Contanos brevemente a qué se dedica tu empresa"
        {...getFieldProps("empresa_descripcion", setFormData)}
        conditions={buildConditions(getSchema(), "empresa_descripcion", formData)}
        isTouched={touched.empresa_descripcion}
      />

      <button
        type="submit"
        disabled={loading || cooldown > 0}
        className="auth-stagger mt-2 w-full rounded-xl bg-brand-blue px-8 py-4 text-white font-bold text-lg shadow-lg shadow-brand-blue/20 transition-all duration-300 hover:bg-brand-deep hover:shadow-brand-deep/25 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {cooldown > 0 ? `Espere ${cooldown}s` : loading ? "Enviando..." : "Enviar solicitud"}
      </button>

      {error && (
        <p className="text-sm text-red-600 mt-1 text-center" role="alert">
          {error}
        </p>
      )}
      {Object.keys(errors).length > 0 && !error && (
        <span className="sr-only" aria-live="polite">
          El formulario tiene errores de validación.
        </span>
      )}
    </form>
  );
}
