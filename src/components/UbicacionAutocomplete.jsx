import { useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/useGoogleMaps';

// Centraliza la integración con Google Places: todos los formularios que piden
// una ubicación comparten la misma extracción de dirección y coordenadas.
export default function UbicacionAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = '',
  required = false,
}) {
  const { isLoaded, loadError } = useGoogleMaps();
  if (loadError) console.warn('UbicacionAutocomplete: Google Maps no cargó:', loadError);

  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    if (!place?.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const direccion = place.formatted_address || '';

    onChange(direccion);
    if (onPlaceSelect) {
      onPlaceSelect({ lat, lng, direccion });
    }
  };

  const inputProps = {
    type: 'text',
    placeholder,
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    autoComplete: 'off',
    required,
  };

  if (!isLoaded) return <input {...inputProps} />;

  return (
    <Autocomplete
      onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
      onPlaceChanged={handlePlaceChanged}
    >
      <input {...inputProps} />
    </Autocomplete>
  );
}
