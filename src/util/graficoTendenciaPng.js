const limitarPorcentaje = (valor) => Math.min(100, Math.max(0, Number(valor) || 0));

export const generarGraficoTendenciaPng = (tendencia) => {
  if (!tendencia || tendencia.length < 2) return null;

  const canvas = document.createElement("canvas");
  const ancho = 560;
  const alto = 240;
  const escala = 2;

  canvas.width = ancho * escala;
  canvas.height = alto * escala;

  const ctx = canvas.getContext("2d");
  ctx.scale(escala, escala);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);

  const margen = { top: 18, right: 18, bottom: 36, left: 48 };
  const areaAncho = ancho - margen.left - margen.right;
  const areaAlto = alto - margen.top - margen.bottom;
  const maxValor = 100;
  const yMin = margen.top;
  const yMax = margen.top + areaAlto;
  const limitarY = (valor) => Math.min(yMax, Math.max(yMin, valor));

  const catmullRom = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };

  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#e2e8f0";

  for (let i = 0; i <= 4; i++) {
    const valor = (maxValor / 4) * i;
    const y = margen.top + areaAlto - (valor / maxValor) * areaAlto;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(valor)}%`, margen.left - 8, y + 4);
    ctx.beginPath();
    ctx.moveTo(margen.left, y);
    ctx.lineTo(ancho - margen.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const puntos = tendencia.map((item, index) => ({
    x: margen.left + (areaAncho / (tendencia.length - 1)) * index,
    y: margen.top + areaAlto - (limitarPorcentaje(item.valor) / maxValor) * areaAlto,
    valor: limitarPorcentaje(item.valor),
    dia: item.dia,
  }));
  const curva = [];
  const segs = 40;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[Math.max(0, i - 1)];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[Math.min(puntos.length - 1, i + 2)];
    for (let t = 0; t <= segs; t++) {
      const tt = t / segs;
      curva.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, tt),
        y: limitarY(catmullRom(p0.y, p1.y, p2.y, p3.y, tt)),
      });
    }
  }

  const unicos = [];
  for (let i = 0; i < curva.length; i++) {
    if (i === 0 || Math.abs(curva[i].x - curva[i - 1].x) > 0.01 || Math.abs(curva[i].y - curva[i - 1].y) > 0.01) {
      unicos.push(curva[i]);
    }
  }

  const gradFill = ctx.createLinearGradient(0, margen.top, 0, margen.top + areaAlto);
  gradFill.addColorStop(0, "rgba(37, 99, 235, 0.35)");
  gradFill.addColorStop(0.4, "rgba(59, 130, 246, 0.12)");
  gradFill.addColorStop(1, "rgba(59, 130, 246, 0.02)");

  ctx.beginPath();
  ctx.moveTo(unicos[0].x, margen.top + areaAlto);
  unicos.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(unicos[unicos.length - 1].x, margen.top + areaAlto);
  ctx.closePath();
  ctx.fillStyle = gradFill;
  ctx.fill();

  const gradStroke = ctx.createLinearGradient(0, 0, ancho, 0);
  gradStroke.addColorStop(0, "#1d4ed8");
  gradStroke.addColorStop(1, "#60a5fa");

  ctx.beginPath();
  ctx.moveTo(unicos[0].x, unicos[0].y);
  for (let i = 1; i < unicos.length; i++) ctx.lineTo(unicos[i].x, unicos[i].y);
  ctx.strokeStyle = gradStroke;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  puntos.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11px -apple-system, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  puntos.forEach((p) => ctx.fillText(p.dia, p.x, alto - 14));

  return canvas.toDataURL("image/png");
};
