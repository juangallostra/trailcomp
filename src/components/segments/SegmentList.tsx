import type { ChangeEvent } from 'react';
import type { SelectedSegment } from '../../domain/selectedSegment';
import type { TrackPoint } from '../../domain/trackPoint';
import { computeSegmentMetrics } from '../../services/segmentMetricsService';

interface SegmentListProps {
  points: TrackPoint[];
  segments: SelectedSegment[];
  pendingStartKm: number | null;
  corpusReadyCount: number;
  searchingSegmentIds: Set<string>;
  resultsCountBySegment: Record<string, number>;
  onUpdateSegment: (id: string, updates: Partial<Pick<SelectedSegment, 'name' | 'startKm' | 'endKm'>>) => void;
  onDeleteSegment: (id: string) => void;
  onCancelPending: () => void;
  onSearchSimilar: (id: string) => void;
}

function formatKm(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatMeters(value: number): string {
  return Math.round(value).toLocaleString('es-ES');
}

function formatPace(secPerKm?: number): string {
  if (secPerKm === undefined || !Number.isFinite(secPerKm)) return '—';
  const totalSeconds = Math.round(secPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}

export function SegmentList({
  points,
  segments,
  pendingStartKm,
  corpusReadyCount,
  searchingSegmentIds,
  resultsCountBySegment,
  onUpdateSegment,
  onDeleteSegment,
  onCancelPending,
  onSearchSimilar,
}: SegmentListProps) {
  function handleKmChange(id: string, field: 'startKm' | 'endKm') {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value);
      if (Number.isFinite(value)) {
        onUpdateSegment(id, { [field]: value });
      }
    };
  }

  return (
    <section className="card">
      <p className="eyebrow">Tramos</p>
      <h2>Tramos seleccionados</h2>

      {pendingStartKm !== null && (
        <div className="inline-error pending-banner">
          Inicio marcado en km {formatKm(pendingStartKm)}. Haz clic en el mapa o el perfil para marcar el final.
          <button type="button" className="button-link" onClick={onCancelPending}>
            Cancelar
          </button>
        </div>
      )}

      {segments.length === 0 && pendingStartKm === null ? (
        <p className="muted">
          Haz clic en el mapa o en el perfil de elevación para marcar el inicio de un tramo, y vuelve a hacer clic
          para marcar el final.
        </p>
      ) : (
        <ul className="segment-list">
          {segments.map((segment) => {
            const metrics = computeSegmentMetrics(points, segment.startKm, segment.endKm);

            return (
              <li key={segment.id} className="segment-item" style={{ borderLeft: `4px solid ${segment.color}` }}>
                <div className="segment-item__main">
                  <input
                    value={segment.name}
                    onChange={(event) => onUpdateSegment(segment.id, { name: event.target.value })}
                  />
                  <div className="inline-label-row">
                    <label className="inline-label">
                      Inicio (km)
                      <input
                        type="number"
                        step="0.01"
                        value={segment.startKm.toFixed(2)}
                        onChange={handleKmChange(segment.id, 'startKm')}
                      />
                    </label>
                    <label className="inline-label">
                      Fin (km)
                      <input
                        type="number"
                        step="0.01"
                        value={segment.endKm.toFixed(2)}
                        onChange={handleKmChange(segment.id, 'endKm')}
                      />
                    </label>
                  </div>
                  <span className="muted small-text">
                    {formatMeters(metrics.distanceM)} m · D+ {formatMeters(metrics.elevationGainM)} m · D-{' '}
                    {formatMeters(metrics.elevationLossM)} m · {metrics.avgSlopePercent.toFixed(1)}%
                    {metrics.hasTimeData ? ` · ${formatPace(metrics.paceSecPerKm)}` : ' · sin datos de tiempo'}
                  </span>
                  {resultsCountBySegment[segment.id] !== undefined && (
                    <span className="muted small-text">{resultsCountBySegment[segment.id]} tramos similares encontrados</span>
                  )}
                </div>
                <div className="segment-actions">
                  <button
                    type="button"
                    disabled={corpusReadyCount === 0 || searchingSegmentIds.has(segment.id)}
                    onClick={() => onSearchSimilar(segment.id)}
                  >
                    {searchingSegmentIds.has(segment.id) ? 'Buscando…' : 'Buscar tramos similares'}
                  </button>
                  <button type="button" className="button-secondary" onClick={() => onDeleteSegment(segment.id)}>
                    Eliminar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
