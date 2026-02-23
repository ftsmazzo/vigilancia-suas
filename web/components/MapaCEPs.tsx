'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface PontoCEP {
  cep: string;
  endereco: string;
  bairro: string;
  lat: number;
  lng: number;
}

// Corrige ícone padrão do Leaflet em bundlers (Next.js)
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapaCEPs({ pontos }: { pontos: PontoCEP[] }) {
  // Centro: Ribeirão Preto
  const centro: [number, number] = [-21.1775, -47.8103];
  const zoom = 12;

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden border border-slate-200 z-0">
      <MapContainer
        center={centro}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pontos.map((p, i) => (
          <Marker key={`${p.cep}-${i}`} position={[p.lat, p.lng]} icon={icon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-slate-800">CEP {p.cep}</p>
                {p.endereco && <p className="text-slate-600">{p.endereco}</p>}
                {p.bairro && <p className="text-slate-500">{p.bairro}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
