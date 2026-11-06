import { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, Search, SlidersHorizontal, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ROLE_CLASSES, ROLE_LABELS, ROLE_ORDER } from "./constantes";

function UsuariosToolbar({
  searchTerm,
  onSearchChange,
  selectedRol,
  onSelectRol,
  selectedEmpresa,
  selectedSede,
  selectedGarage,
  onEmpresaChange,
  onSedeChange,
  onGarageChange,
  onClearFilters,
  activeFiltersCount,
  empresasDisponibles,
  sedesDisponibles,
  garagesDisponibles,
}) {
  const dropdownRef = useRef(null);
  const buttonFilterRef = useRef(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showFilters &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonFilterRef.current &&
        !buttonFilterRef.current.contains(event.target)
      ) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);

  useGSAP(() => {
    if (!dropdownRef.current) return;
    if (showFilters) {
      gsap.fromTo(
        dropdownRef.current,
        { y: -10, autoAlpha: 0, scale: 0.98 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.25, ease: "power2.out", display: "flex" }
      );
    } else {
      gsap.to(dropdownRef.current, {
        y: -10, autoAlpha: 0, scale: 0.98, duration: 0.2, ease: "power2.in", display: "none"
      });
    }
  }, [showFilters]);

  return (
    <section className="usuarios-toolbar usuarios-animate-toolbar">

      <div className="usuarios-search-filter-group">
        <div className="usuarios-search">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o rol..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filtros-wrapper">
          <button
            ref={buttonFilterRef}
            className={`btn-toggle-filtros ${activeFiltersCount > 0 ? 'activo' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            <span>Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="filtros-badge">{activeFiltersCount}</span>
            )}
            <ChevronDown size={16} className={`chevron-filter ${showFilters ? 'open' : ''}`} />
          </button>

          <div className="filtros-dropdown-panel" ref={dropdownRef}>
            <div className="filtros-dropdown-header">
              <SlidersHorizontal size={16}/>
              <span>Filtros avanzados</span>
            </div>

            <div className="filtros-dropdown-body">
              <div className="form-group-filter">
                <label>Empresa</label>
                <div className="select-wrapper">
                  <select
                    value={selectedEmpresa}
                    onChange={(e) => onEmpresaChange(e.target.value)}
                  >
                    <option value="">Todas las empresas</option>
                    {empresasDisponibles.map((emp) => (
                      <option key={emp} value={emp}>
                        {emp}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="chevron-select" />
                </div>
              </div>

              <div className="form-group-filter">
                <label>Sede</label>
                <div className="select-wrapper">
                  <select
                    value={selectedSede}
                    onChange={(e) => onSedeChange(e.target.value)}
                  >
                    <option value="">Todas las sedes</option>
                    {sedesDisponibles.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="chevron-select" />
                </div>
              </div>

              <div className="form-group-filter">
                <label>Garage</label>
                <div className="select-wrapper">
                  <select
                    value={selectedGarage}
                    onChange={(e) => onGarageChange(e.target.value)}
                  >
                    <option value="">Todos los garages</option>
                    {garagesDisponibles.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="chevron-select" />
                </div>
              </div>
            </div>

            {activeFiltersCount > 0 && (
              <div className="filtros-dropdown-footer">
                <button
                  className="btn-limpiar-dropdown"
                  onClick={onClearFilters}
                >
                  <X size={14} />
                  Limpiar todos
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="usuarios-role-pills">
        <button
          className={`role-pill ${!selectedRol ? "active" : ""}`}
          onClick={() => onSelectRol("")}
        >
          Todos
        </button>
        {ROLE_ORDER.map((rid) => (
          <button
            key={rid}
            className={`role-pill ${ROLE_CLASSES[rid]} ${Number(selectedRol) === rid ? "active" : ""}`}
            onClick={() => onSelectRol(String(rid))}
          >
            {ROLE_LABELS[rid]}
          </button>
        ))}
      </div>
    </section>
  );
}

export default UsuariosToolbar;
