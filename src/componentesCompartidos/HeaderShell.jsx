import { useNavigate } from "react-router-dom";
import logoSmartlot from "../Imagenes/Logo_SmartLot-removebg-preview.png";
import "./app_header.css";

/**
 * Estructura común de los headers: logo clickeable a la izquierda y acciones a la derecha.
 * Cada rol conserva sus clases, tema y contenido mediante props.
 */
function HeaderShell({
  as: Tag = "div",
  className,
  leftClassName = "header-left",
  rightClassName = "header-right",
  logoClassName = "logo-smartlot",
  spacerClassName = "header-spacer",
  homePath,
  logo = logoSmartlot,
  logoAlt = "logo SmartLot",
  leftExtra = null,
  children,
}) {
  const navigate = useNavigate();

  return (
    <>
      <Tag className={className}>
        <div className={leftClassName}>
          <div className={logoClassName}>
            <img
              onClick={() => navigate(homePath)}
              src={logo}
              alt={logoAlt}
              style={{ cursor: "pointer" }}
            />
          </div>
          {leftExtra}
        </div>

        <div className={rightClassName}>{children}</div>
      </Tag>

      {spacerClassName ? <div className={spacerClassName} aria-hidden="true" /> : null}
    </>
  );
}

export default HeaderShell;
