import { useEffect, useRef } from 'react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LeafletMouseEvent } from 'leaflet';
import type { SelectedSegment } from '../../domain/selectedSegment';
import type { TrackPoint } from '../../domain/trackPoint';
import { getClosestPoint, getPointAtDistance, pointsInRange } from '../../services/pointInterpolation';

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [32, 32] });
    }
  }, [map, positions]);

  return null;
}

interface MapPreviewProps {
  points: TrackPoint[];
  segments?: SelectedSegment[];
  pendingStartKm?: number | null;
  hoveredKm?: number | null;
  onHoverKm?: (km: number | null) => void;
  onClickKm?: (km: number) => void;
}

function formatKm(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function positionsFromPoints(points: TrackPoint[]): [number, number][] {
  return points.map((point) => [point.lat, point.lon] as [number, number]);
}

export function MapPreview({
  points,
  segments = [],
  pendingStartKm,
  hoveredKm,
  onHoverKm,
  onClickKm,
}: MapPreviewProps) {
  const animationFrameRef = useRef<number | null>(null);

  if (points.length === 0) {
    return (
      <section className="card map-card empty-map">
        <p className="eyebrow">Mapa</p>
        <h2>Mapa</h2>
        <p className="muted">Carga un track para visualizar el recorrido.</p>
      </section>
    );
  }

  const positions = positionsFromPoints(points);
  const center = positions[Math.floor(positions.length / 2)];
  const hoveredPoint = hoveredKm !== null && hoveredKm !== undefined ? getPointAtDistance(points, hoveredKm * 1000) : undefined;
  const pendingPoint = pendingStartKm !== null && pendingStartKm !== undefined ? getPointAtDistance(points, pendingStartKm * 1000) : undefined;

  function updateHoverFromEvent(event: LeafletMouseEvent) {
    if (!onHoverKm) return;

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      const closest = getClosestPoint(points, { lat: event.latlng.lat, lon: event.latlng.lng });
      onHoverKm(closest ? closest.distanceFromStart / 1000 : null);
    });
  }

  function handleTrackClick(event: LeafletMouseEvent) {
    if (!onClickKm) return;
    const closest = getClosestPoint(points, { lat: event.latlng.lat, lon: event.latlng.lng });
    if (closest) {
      onClickKm(closest.distanceFromStart / 1000);
    }
  }

  return (
    <section className="card map-card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Mapa</p>
          <h2>Mapa</h2>
          <p className="muted">Mueve el ratón para sincronizar el perfil. Haz clic para marcar inicio/fin de un tramo.</p>
        </div>
        {hoveredKm !== null && hoveredKm !== undefined && <span className="pill">Km {formatKm(hoveredKm)}</span>}
      </div>

      <div className="map-wrapper">
        <MapContainer center={center} zoom={13} scrollWheelZoom className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds positions={positions} />
          <Polyline
            positions={positions}
            pathOptions={{ weight: 4, color: '#334155' }}
            eventHandlers={{
              mousemove: updateHoverFromEvent,
              mouseout: () => onHoverKm?.(null),
              click: handleTrackClick,
            }}
          />

          {segments.map((segment) => (
            <Polyline
              key={segment.id}
              positions={positionsFromPoints(pointsInRange(points, segment.startKm, segment.endKm))}
              pathOptions={{ weight: 7, color: segment.color, opacity: 0.9 }}
            />
          ))}

          {hoveredPoint && (
            <CircleMarker center={[hoveredPoint.lat, hoveredPoint.lon]} radius={8} pathOptions={{ weight: 3, color: '#111827', fillOpacity: 0.9 }}>
              <Popup>Km {formatKm(hoveredKm ?? 0)}</Popup>
            </CircleMarker>
          )}

          {pendingPoint && (
            <CircleMarker center={[pendingPoint.lat, pendingPoint.lon]} radius={9} pathOptions={{ weight: 3, color: '#0f172a', fillColor: '#facc15', fillOpacity: 1 }}>
              <Popup>Inicio del tramo: km {formatKm(pendingStartKm ?? 0)}</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
    </section>
  );
}
