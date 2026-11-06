import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Clock, FileText, TrendingUp, Users, Zap } from "lucide-react";
import "./admin_reportes_analisis.css";
import Header from "../componentesAdmin/header_admin";
import FooterEmpleado from "../componentesAdmin/footer_admin";
import { exportarReporteExcel } from "../util/exportar_reportes_excel";
import { useAuth } from "../contexts/useAuth";
import { GaragesGetAll } from "../servicies/API_Garage";
import { UsuariosGetAll } from "../servicies/API_Usuario";
import { ReservasGetAll } from "../servicies/API_Reserva";
import { exportarReportePDF } from "../util/exportar_reporte_pdf";
import logoSmartLot from "../Imagenes/Logo_SmartLot-removebg-preview.png";
import {
  calcularHorasEntre,
  calcularHorasPico,
  contarReservasEnRango,
  normalizarGranularidadLabel,
  obtenerDiaSemanaLocal,
  obtenerFechaEntradaReserva,
  obtenerFechaSalidaReserva,
  obtenerRangoPeriodo,
  seSolapaConRango,
} from "../helpers/reportes";
import { generarGraficoTendenciaPng } from "../util/graficoTendenciaPng";
import KpiGrid from "../componentesAdmin/reportes_analisis/kpi_grid";
import PeriodNavigator from "../componentesAdmin/reportes_analisis/period_navigator";
import TendenciaChart from "../componentesAdmin/reportes_analisis/tendencia_chart";

const REPORTES_MIN_LOADING_MS = 650;

const obtenerListado = (datos) => {
  if (Array.isArray(datos)) return datos;
  if (Array.isArray(datos?.datos)) return datos.datos;
  if (Array.isArray(datos?.data)) return datos.data;
  if (Array.isArray(datos?.reservas)) return datos.reservas;
  if (Array.isArray(datos?.usuarios)) return datos.usuarios;
  return [];
};

const obtenerIdUsuario = (item) => item?.id_usuario ?? item?.idUsuario ?? item?.usuario_id ?? item?.id;

const cargarImagenBase64 = async (src) => {
  const response = await fetch(src);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const ReportesSkeleton = () => (
  <>
    <section className="reportes-section">
      <div className="export-actions">
        <article className="report-btn-skeleton" aria-label="Cargando accion de exportacion">
          <span className="reportes-skeleton-icon" />
          <div className="report-btn__content">
            <span className="reportes-skeleton-line reportes-skeleton-title" />
            <span className="reportes-skeleton-line reportes-skeleton-subtitle" />
          </div>
        </article>
      </div>
    </section>

    <section className="kpi-grid" aria-label="Cargando indicadores">
      {Array.from({ length: 4 }).map((_, index) => (
        <article className="kpi-card kpi-card-skeleton" key={index}>
          <div className="kpi-card__header">
            <span className="reportes-skeleton-icon" />
            <span className="reportes-skeleton-line reportes-skeleton-kpi-label" />
          </div>
          <span className="reportes-skeleton-line reportes-skeleton-kpi-value" />
        </article>
      ))}
    </section>

    <section className="reportes-section" aria-label="Cargando grafico de tendencia">
      <div className="reportes-section__title-container">
        <span className="reportes-skeleton-small-icon" />
        <span className="reportes-skeleton-line reportes-skeleton-section-title" />
      </div>
      <div className="trend-chart-wrapper trend-chart-wrapper-skeleton">
        <span className="reportes-skeleton-axis reportes-skeleton-axis-y" />
        <div className="reportes-skeleton-area-chart">
          <div className="reportes-skeleton-area-chart-bg">
            <svg className="reportes-skeleton-svg" viewBox="0 0 460 190" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="skelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#64748b" stopOpacity="0.20" />
                  <stop offset="40%" stopColor="#94a3b8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="skelGradGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#94a3b8" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="skelLineGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#cbd5e1" />
                  <stop offset="60%" stopColor="#94a3b8" />
                  <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
                <filter id="skelBlur">
                  <feGaussianBlur stdDeviation="8" />
                </filter>
              </defs>
              <g className="skel-grid-group">
                {[38, 76, 114, 152].map((y, i) => (
                  <line key={y} x1="0" y1={y} x2="460" y2={y}
                    stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4"
                    className="skel-grid-line" style={{ animationDelay: `${i * 0.08}s` }} />
                ))}
              </g>
              <path className="skel-area-glow"
                d="M30,135 Q63,105 96.7,97.5 Q130,80 163.3,75 Q196.7,100 230,105 Q263.3,80 296.7,67.5 Q330,50 363.3,45 Q396.7,75 430,90 L430,180 L30,180 Z"
                fill="url(#skelGradGlow)" filter="url(#skelBlur)" />
              <path className="skel-area-fill"
                d="M30,135 Q63,105 96.7,97.5 Q130,80 163.3,75 Q196.7,100 230,105 Q263.3,80 296.7,67.5 Q330,50 363.3,45 Q396.7,75 430,90 L430,180 L30,180 Z"
                fill="url(#skelGrad)" />
              <path className="skel-line"
                d="M30,135 Q63,105 96.7,97.5 Q130,80 163.3,75 Q196.7,100 230,105 Q263.3,80 296.7,67.5 Q330,50 363.3,45 Q396.7,75 430,90"
                fill="none" stroke="url(#skelLineGrad)" strokeWidth="3" strokeLinecap="round" />
              {[
                { x: 30, y: 135 }, { x: 96.7, y: 97.5 }, { x: 163.3, y: 75 },
                { x: 230, y: 105 }, { x: 296.7, y: 67.5 }, { x: 363.3, y: 45 }, { x: 430, y: 90 },
              ].map((d, i) => (
                <g key={i} className="skel-dot-group" style={{ animationDelay: `${0.25 + i * 0.1}s` }}>
                  <circle cx={d.x} cy={d.y} r="10" fill="#94a3b8" className="skel-dot-glow" />
                  <circle cx={d.x} cy={d.y} r="0" fill="#cbd5e1" stroke="#ffffff" strokeWidth="2.5" className="skel-dot">
                    <animate attributeName="r" values="0;5;3.5;4.5;4" dur="0.45s" begin={`${0.25 + i * 0.1}s`} fill="freeze" />
                  </circle>
                </g>
              ))}
            </svg>
          </div>
        </div>
        <span className="reportes-skeleton-axis reportes-skeleton-axis-x" />
      </div>
    </section>
  </>
);

export default function AdminReportesAnalisis() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [garages, setGarages] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportando, setExportando] = useState(false);
  const [granularidad, setGranularidad] = useState("semana");
  const [fechaActual, setFechaActual] = useState(() => new Date());

  useEffect(() => {
    let montado = true;

    const fetchData = async () => {
      const inicioCarga = Date.now();
      setLoading(true);
      setError("");

      try {
        const [garRes, usuRes, resRes] = await Promise.all([
          GaragesGetAll(),
          UsuariosGetAll(),
          ReservasGetAll(),
        ]);

        if (!montado) return;

        const garArray = obtenerListado(garRes.datos);
        const usuArray = obtenerListado(usuRes.datos);
        const resArray = obtenerListado(resRes.datos);

        const adminIdSede = Number(usuario?.id_sede);
        const empresaAdmin = Number(usuario?.id_empresa);
        const tieneEmpresa = !isNaN(empresaAdmin) && empresaAdmin > 0;

        let garagesFiltrados = garArray;
        let usuariosFiltrados = usuArray;
        let reservasFiltradas = resArray;

        if (adminIdSede) {
          const userIds = new Set(
            usuArray.filter((u) => Number(u.id_sede ?? u.idSede) === adminIdSede).map((u) => Number(obtenerIdUsuario(u)))
          );
          usuariosFiltrados = usuArray.filter((u) => userIds.has(Number(obtenerIdUsuario(u))));
          const garageIds = new Set(garagesFiltrados.map((g) => Number(g.id_garage ?? g.idGarage ?? g.id)));
          reservasFiltradas = resArray.filter((r) => garageIds.has(Number(r.id_garage ?? r.idGarage ?? r.garage_id)));
        } else if (tieneEmpresa) {
          const userIds = new Set(
            usuArray.filter((u) => Number(u.id_empresa ?? u.idEmpresa) === empresaAdmin).map((u) => Number(obtenerIdUsuario(u)))
          );
          usuariosFiltrados = usuArray.filter((u) => userIds.has(Number(obtenerIdUsuario(u))));
          const garageIds = new Set(garagesFiltrados.map((g) => Number(g.id_garage ?? g.idGarage ?? g.id)));
          reservasFiltradas = resArray.filter((r) => garageIds.has(Number(r.id_garage ?? r.idGarage ?? r.garage_id)));
        }

        setGarages(garagesFiltrados);
        setUsuarios(usuariosFiltrados);
        setReservas(reservasFiltradas);
      } catch (err) {
        console.error("Error al cargar datos de reportes:", err);
        if (montado) setError("Error al cargar los datos.");
      } finally {
        const tiempoRestante = Math.max(0, REPORTES_MIN_LOADING_MS - (Date.now() - inicioCarga));
        if (tiempoRestante > 0) {
          await new Promise((resolve) => setTimeout(resolve, tiempoRestante));
        }
        if (montado) setLoading(false);
      }
    };

    fetchData();
    return () => { montado = false; };
  }, [usuario]);

  const datosReporte = useMemo(() => {
    let totalOcupados = 0;
    let totalCapacidad = 0;
    garages.forEach((g) => {
      totalOcupados += Number(g.ocupacion_reservas || 0) + Number(g.ocupacion_no_reservas || 0);
      totalCapacidad += Number(g.capacidad_reservas || 0) + Number(g.capacidad_para_no_reservas || 0);
    });
    const ocupacionMedia = totalCapacidad > 0 ? Math.round((totalOcupados / totalCapacidad) * 100) : 0;

    const usuariosActivos = usuarios.filter((u) => u.activo !== false && Number(u.id_rol) !== 1).length;

    let totalHoras = 0;
    let count = 0;
    reservas.forEach((r) => {
      const entrada = obtenerFechaEntradaReserva(r);
      const salida = obtenerFechaSalidaReserva(r);
      const diff = calcularHorasEntre(entrada, salida);
      if (diff !== null && diff < 24) {
        totalHoras += diff;
        count++;
      }
    });
    const tiempoPromedio = count > 0 ? `${(totalHoras / count).toFixed(1)} hrs` : "—";

    const horasPico = calcularHorasPico(reservas);

    const diasSemana = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const diaCount = [0, 0, 0, 0, 0, 0, 0];
    reservas.forEach((r) => {
      const entrada = obtenerFechaEntradaReserva(r);
      if (entrada) {
        const dia = obtenerDiaSemanaLocal(entrada);
        if (dia !== null) {
          diaCount[dia]++;
        }
      }
    });
    const maxCount = Math.max(...diaCount, 1);
    const tendencia = diasSemana.map((dia, i) => ({
      dia,
      valor: Math.round((diaCount[i] / maxCount) * 100),
    }));

    return { ocupacionMedia, usuariosActivos, tiempoPromedio, horasPico, tendencia };
  }, [garages, usuarios, reservas]);

  const tendenciaDinamica = useMemo(() => {
    if (!reservas.length) return [];
    const { inicio: inicioPeriodo } = obtenerRangoPeriodo(fechaActual, granularidad);
    let buckets = [];

    switch (granularidad) {
      case "dia": {
        buckets = Array.from({ length: 24 }, (_, h) => {
          const inicio = new Date(inicioPeriodo);
          inicio.setHours(h, 0, 0, 0);
          const fin = new Date(inicio);
          fin.setHours(h + 1, 0, 0, 0);
          const count = contarReservasEnRango(reservas, inicio, fin);
          return { dia: `${String(h).padStart(2, "0")}:00`, count };
        });
        break;
      }
      case "semana": {
        const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
        buckets = diasSemana.map((nombre, i) => {
          const inicio = new Date(inicioPeriodo);
          inicio.setDate(inicioPeriodo.getDate() + i);
          const fin = new Date(inicio);
          fin.setDate(inicio.getDate() + 1);
          const count = contarReservasEnRango(reservas, inicio, fin);
          return { dia: nombre, count };
        });
        break;
      }
      case "mes": {
        const año = inicioPeriodo.getFullYear();
        const mes = inicioPeriodo.getMonth();
        const diasEnMes = new Date(año, mes + 1, 0).getDate();
        buckets = Array.from({ length: diasEnMes }, (_, d) => {
          const inicio = new Date(año, mes, d + 1);
          const fin = new Date(inicio);
          fin.setDate(inicio.getDate() + 1);
          const count = contarReservasEnRango(reservas, inicio, fin);
          return { dia: String(d + 1), count };
        });
        break;
      }
      case "año": {
        const añoNum = inicioPeriodo.getFullYear();
        const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
        buckets = meses.map((nombre, i) => {
          const inicio = new Date(añoNum, i, 1);
          const fin = new Date(añoNum, i + 1, 1);
          const count = contarReservasEnRango(reservas, inicio, fin);
          return { dia: nombre, count };
        });
        break;
      }
    }

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    return buckets.map((b) => ({ ...b, valor: Math.round((b.count / maxCount) * 100) }));
  }, [reservas, granularidad, fechaActual]);

  const periodLabel = useMemo(() => {
    switch (granularidad) {
      case "dia":
        return fechaActual.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      case "semana": {
        const diaSemana = fechaActual.getDay();
        const lunes = new Date(fechaActual);
        lunes.setDate(fechaActual.getDate() - ((diaSemana + 6) % 7));
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        const fmtInicio = lunes.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
        const fmtFin = domingo.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        return `${fmtInicio} - ${fmtFin}`;
      }
      case "mes":
        return fechaActual.toLocaleDateString("es-AR", {
          month: "long",
          year: "numeric",
        });
      case "año":
        return String(fechaActual.getFullYear());
      default:
        return "";
    }
  }, [granularidad, fechaActual]);

  const reservasPeriodo = useMemo(() => {
    const { inicio, fin } = obtenerRangoPeriodo(fechaActual, granularidad);
    return reservas.filter((reserva) => seSolapaConRango(reserva, inicio, fin));
  }, [reservas, granularidad, fechaActual]);

  const datosReporteVisible = useMemo(() => ({
    ...datosReporte,
    horasPico: calcularHorasPico(reservasPeriodo),
    tendencia: tendenciaDinamica,
    granularidad,
    granularidadLabel: normalizarGranularidadLabel(granularidad),
    periodo: periodLabel,
    reservasTotales: reservasPeriodo.length,
    etiquetaDimension: granularidad === "dia" ? "Hora" : granularidad === "año" ? "Mes" : "Dia",
  }), [datosReporte, reservasPeriodo, tendenciaDinamica, granularidad, periodLabel]);

  const puedeAvanzar = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    switch (granularidad) {
      case "dia": {
        const sig = new Date(fechaActual);
        sig.setDate(fechaActual.getDate() + 1);
        sig.setHours(0, 0, 0, 0);
        return sig <= hoy;
      }
      case "semana": {
        const sig = new Date(fechaActual);
        sig.setDate(fechaActual.getDate() + 7);
        return sig <= hoy;
      }
      case "mes": {
        const sig = new Date(fechaActual);
        sig.setMonth(fechaActual.getMonth() + 1);
        sig.setDate(1);
        return sig <= hoy;
      }
      case "año": {
        const sig = new Date(fechaActual);
        sig.setFullYear(fechaActual.getFullYear() + 1);
        sig.setMonth(0, 1);
        return sig <= hoy;
      }
      default:
        return false;
    }
  }, [granularidad, fechaActual]);

  const navegarAtras = () => {
    const nueva = new Date(fechaActual);
    switch (granularidad) {
      case "dia":
        nueva.setDate(fechaActual.getDate() - 1);
        break;
      case "semana":
        nueva.setDate(fechaActual.getDate() - 7);
        break;
      case "mes":
        nueva.setMonth(fechaActual.getMonth() - 1);
        break;
      case "año":
        nueva.setFullYear(fechaActual.getFullYear() - 1);
        break;
    }
    setFechaActual(nueva);
  };

  const navegarAdelante = () => {
    const nueva = new Date(fechaActual);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    switch (granularidad) {
      case "dia":
        nueva.setDate(fechaActual.getDate() + 1);
        break;
      case "semana":
        nueva.setDate(fechaActual.getDate() + 7);
        break;
      case "mes":
        nueva.setMonth(fechaActual.getMonth() + 1);
        break;
      case "año":
        nueva.setFullYear(fechaActual.getFullYear() + 1);
        break;
    }
    if (nueva <= hoy) setFechaActual(nueva);
  };

  const navegarConTransicion = (ruta) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => navigate(ruta, { replace: true }));
    } else {
      navigate(ruta, { replace: true });
    }
  };

  const exportarExcel = async () => {
    if (loading || exportando) return;
    try {
      setExportando(true);
      const graficoTendencia = generarGraficoTendenciaPng(datosReporteVisible.tendencia);
      await exportarReporteExcel(datosReporteVisible, { graficoTendencia });
    } catch (errorExportacion) {
      console.error("No se pudo exportar el reporte a Excel:", errorExportacion);
    } finally {
      setExportando(false);
    }
  };
  const exportarPDF = async () => {
    if (loading || exportando) return;
    try {
      setExportando(true);
      const graficoTendencia = generarGraficoTendenciaPng(datosReporteVisible.tendencia);
      const logoBase64 = await cargarImagenBase64(logoSmartLot);
      await exportarReportePDF(datosReporteVisible, {
        graficoTendencia,
        logoBase64,
      });
    } catch (errorExportacion) {
      console.error("No se pudo exportar el reporte a PDF:", errorExportacion);
    } finally {
      setExportando(false);
    }
  };
  const kpis = [
    {
      label: "Ocupacion Media",
      value: loading ? "—" : `${datosReporte.ocupacionMedia}%`,
      raw: loading ? null : datosReporte.ocupacionMedia,
      suffix: "%",
      icon: BarChart3,
      color: "#1d4ed8",
      bg: "#eff6ff",
    },
    {
      label: "Usuarios Activos",
      value: loading ? "—" : datosReporte.usuariosActivos.toLocaleString(),
      raw: loading ? null : datosReporte.usuariosActivos,
      suffix: "",
      icon: Users,
      color: "#059669",
      bg: "#ecfdf5",
    },
    {
      label: "Tiempo Promedio",
      value: loading ? "—" : datosReporte.tiempoPromedio,
      icon: Clock,
      color: "#d97706",
      bg: "#fffbeb",
    },
    {
      label: "Horas Pico",
      value: loading ? "—" : datosReporteVisible.horasPico,
      icon: Zap,
      color: "#dc2626",
      bg: "#fef2f2",
    },
  ];

  return (
    <div className="admin-panel admin-reportes-page">
      <Header />
      <header className="admin-panel__header">
        <button
          className="admin-panel__back-btn"
          onClick={() => navegarConTransicion("/admin_panel_de_control")}
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="admin-panel__title">Reportes y Analisis</h1>
          <p className="admin-panel__subtitle">
            Visualiza el rendimiento general y las auditorias del sistema.
          </p>
        </div>
      </header>

      {loading ? (
        <ReportesSkeleton />
      ) : (
        <>
          <section className="reportes-section">
            <div className="export-actions">
              <button className="report-btn report-btn--excel" onClick={exportarExcel} disabled={loading || exportando}>
                <div className="report-btn__icon-wrapper">
                  <FileText size={24} className="report-btn__icon" />
                </div>
                <div className="report-btn__content">
                  <span className="report-btn__title">Exportar a Excel</span>
                  <span className="report-btn__subtitle">Reporte en XLSX</span>
                </div>
              </button>
              <button className="report-btn report-btn--pdf" onClick={exportarPDF} disabled={loading || exportando}>
                <div className="report-btn__icon-wrapper">
                  <FileText size={24} className="report-btn__icon" />
                </div>
                <div className="report-btn__content">
                  <span className="report-btn__title">Exportar a PDF</span>
                  <span className="report-btn__subtitle">Reporte en PDF</span>
                </div>
              </button>
            </div>
          </section>

          {error && (
            <p style={{ color: "#dc2626", padding: "12px 0", fontWeight: 600 }} role="alert">
              {error}
            </p>
          )}

          <KpiGrid kpis={kpis} />

          <section className="reportes-section">
            <div className="reportes-section__title-container">
              <TrendingUp size={20} className="reportes-section__icon" />
              <h2 className="reportes-section__title">Tendencia de Ocupacion</h2>
            </div>
            <PeriodNavigator
              granularidad={granularidad}
              onGranularidadChange={setGranularidad}
              periodLabel={periodLabel}
              puedeAvanzar={puedeAvanzar}
              onAtras={navegarAtras}
              onAdelante={navegarAdelante}
            />
            <TendenciaChart data={tendenciaDinamica} granularidad={granularidad} />
          </section>
        </>
      )}

      <FooterEmpleado />
    </div>
  );
}
