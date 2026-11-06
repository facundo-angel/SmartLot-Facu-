import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="trend-tooltip">
        <span className="trend-tooltip__day">{label}</span>
        <span className="trend-tooltip__value">{data.valor}%</span>
        {data.count !== undefined && (
          <span className="trend-tooltip__count">{data.count} reservas</span>
        )}
        <div className="trend-tooltip__bar">
          <div className="trend-tooltip__fill" style={{ width: `${data.valor}%` }} />
        </div>
      </div>
    );
  }
  return null;
};

const CustomDot = (props) => {
  const { cx, cy, index } = props;
  if (!cx || !cy) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="#2563eb"
      stroke="#ffffff"
      strokeWidth={2.5}
      style={{ animationDelay: `${0.6 + index * 0.08}s` }}
      className="trend-chart-dot"
    />
  );
};

const CustomActiveDot = (props) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <>
      <circle cx={cx} cy={cy} r={10} fill="rgba(37, 99, 235, 0.12)" stroke="none" />
      <circle cx={cx} cy={cy} r={6} fill="#2563eb" stroke="#ffffff" strokeWidth={3} />
    </>
  );
};

const footerText = (granularidad) => {
  if (granularidad === "dia") return "Reservas por hora del día seleccionado";
  if (granularidad === "semana") return "Reservas por día de la semana";
  if (granularidad === "mes") return "Reservas por día del mes";
  return "Reservas por mes del año";
};

export default function TendenciaChart({ data, granularidad }) {
  return (
    <div className="trend-chart-wrapper">
      <div className="trend-chart-accent" />
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 16, right: 12, left: -8, bottom: 8 }}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
              <stop offset="40%" stopColor="#3b82f6" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
            <filter id="areaGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="dia"
            tick={{ fontSize: 13, fill: "#64748b", fontWeight: 600, letterSpacing: "0.02em" }}
            axisLine={{ stroke: "#e2e8f0", strokeWidth: 1 }}
            tickLine={false}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 13, fill: "#475569", fontWeight: 600, letterSpacing: "0.02em" }}
            axisLine={false}
            tickLine={false}
            dx={-2}
            width={48}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke="url(#areaStroke)"
            strokeWidth={3}
            fill="url(#areaGradient)"
            filter="url(#areaGlow)"
            animationDuration={1200}
            animationEasing="ease-out"
            dot={<CustomDot />}
            activeDot={CustomActiveDot}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="trend-chart-footer">
        <span className="trend-chart-footer__dot" />
        <span>{footerText(granularidad)}</span>
      </div>
    </div>
  );
}
