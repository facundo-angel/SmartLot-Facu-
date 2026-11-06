import { useEffect, useState } from "react";

export default function useStaleIndicator(ultimaActualizacion) {
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState("");
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!ultimaActualizacion) return;

    const update = () => {
      const segs = Math.floor((Date.now() - ultimaActualizacion) / 1000);
      if (segs < 60) {
        setTiempoTranscurrido(`Actualizado hace ${segs}s`);
      } else {
        setTiempoTranscurrido(`Actualizado hace ${Math.floor(segs / 60)}m`);
      }
      setIsStale(segs > 300);
    };

    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, [ultimaActualizacion]);

  return { tiempoTranscurrido, isStale };
}
