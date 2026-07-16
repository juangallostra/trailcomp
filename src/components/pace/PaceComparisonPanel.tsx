import type { MatchResult } from '../../domain/matchResult';
import type { SegmentMetrics } from '../../domain/segmentMetrics';
import type { SelectedSegment } from '../../domain/selectedSegment';
import { comparePaceDelta, computePaceComparison, formatPaceDeltaWithPercent } from '../../services/paceComparison';

interface PaceComparisonPanelProps {
  segment: SelectedSegment;
  targetMetrics?: SegmentMetrics;
  results: MatchResult[];
}

function formatPace(secPerKm?: number): string {
  if (secPerKm === undefined || !Number.isFinite(secPerKm)) return '—';
  const totalSeconds = Math.round(secPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds)) return '—';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    : `${minutes}:${secs.toString().padStart(2, '0')} min`;
}

export function PaceComparisonPanel({ segment, targetMetrics, results }: PaceComparisonPanelProps) {
  const stats = computePaceComparison(results);
  // Referencia = media del corpus, comparado = objetivo: el badge describe cómo rinde el
  // objetivo frente a la media (p.ej. "objetivo +0:20/km lento" = el objetivo es más lento).
  const delta = comparePaceDelta(stats?.meanPaceSecPerKm, targetMetrics?.paceSecPerKm);

  return (
    <section className="card">
      <p className="eyebrow" style={{ color: segment.color }}>
        {segment.name}
      </p>
      <h2>Comparativa de ritmo</h2>

      {!targetMetrics?.hasTimeData && (
        <p className="muted">El tramo objetivo no tiene datos de tiempo suficientes para comparar el ritmo.</p>
      )}

      {targetMetrics?.hasTimeData && !stats && (
        <p className="muted">Ninguno de los tramos similares encontrados tiene datos de ritmo disponibles.</p>
      )}

      {targetMetrics?.hasTimeData && stats && (
        <>
          <p className="muted small-text">
            Basado en {stats.sampleSize} de {stats.totalMatches} tramos similares con datos de ritmo disponibles.
          </p>

          <div className="summary-grid">
            <div>
              <span>Ritmo objetivo</span>
              <strong>{formatPace(targetMetrics.paceSecPerKm)}</strong>
            </div>
            <div>
              <span>Media de similares</span>
              <strong>{formatPace(stats.meanPaceSecPerKm)}</strong>
            </div>
            <div>
              <span>Mediana de similares</span>
              <strong>{formatPace(stats.medianPaceSecPerKm)}</strong>
            </div>
            <div>
              <span>Objetivo vs media</span>
              <strong>
                {delta ? (
                  <span className={`pace-delta pace-delta--${delta.direction}`}>{formatPaceDeltaWithPercent(delta)}</span>
                ) : (
                  '—'
                )}
              </strong>
            </div>
            <div>
              <span>Duración objetivo</span>
              <strong>{formatDuration(targetMetrics.durationSec)}</strong>
            </div>
            <div>
              <span>Duración media similares</span>
              <strong>{formatDuration(stats.meanDurationSec)}</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
