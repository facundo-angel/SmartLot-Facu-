import { Car, X } from "lucide-react";
import ModalPortal from "../../componentesCompartidos/ModalPortal";

function ModalGaragesUsuario({ usuario, onClose }) {
  return (
    <ModalPortal onClose={onClose} overlayClassName="garages-owner-overlay">
      <section className="garages-owner-modal" role="dialog" aria-modal="true" aria-labelledby="garages-owner-title" onClick={(event) => event.stopPropagation()}>
        <header><div className="garages-owner-modal__icon"><Car size={21}/></div><div><span>Dueño de garage</span><h2 id="garages-owner-title">Garages de {usuario.nombre}</h2><p>{usuario.garages.length} garages asociados</p></div><button type="button" onClick={onClose} aria-label="Cerrar listado de garages"><X size={20}/></button></header>
        <ul>{usuario.garages.map((garage, index) => <li key={`${garage}-${index}`}><span>{index + 1}</span><div><strong>{garage}</strong><small>Garage administrado</small></div></li>)}</ul>
      </section>
    </ModalPortal>
  );
}

export default ModalGaragesUsuario;
