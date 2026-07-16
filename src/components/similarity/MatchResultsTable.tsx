import type { MatchResult } from '../../domain/matchResult';
import type { SegmentMetrics } from '../../domain/segmentMetrics';
import type { SelectedSegment } from '../../domain/selectedSegment';
import { comparePaceDelta, formatPaceDeltaShort } from '../../services/paceComparison';
import { MiniProfile } from './MiniProfile';

interface MatchResultsTableProps {
  segment: SelectedSegment;
  targetMetrics?: SegmentMetrics;
  results: MatchResult[];
  isSearching?: boolean;
}

function formatMeters(value: number): string {
  return Math.round(value).toLocaleString('es-ES');
}

function formatKm(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPace(secPerKm?: number): string {
  if (secPerKm === undefined || !Number.isFinite(secPerKm)) return '—';
  const totalSeconds = Math.round(secPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

function scoreBreakdownTitle(result: MatchResult): string {
  const parts = [
    `distancia ${result.score.distanceScore.toFixed(0)}`,
    `D+ ${result.score.elevationGainScore.toFixed(0)}`,
    `D- ${result.score.elevationLossScore.toFixed(0)}`,
    `pendiente ${result.score.avgSlopeScore.toFixed(0)}`,
  ];
  if (result.score.shapeScore !== undefined) {
    parts.push(`forma ${result.score.shapeScore.toFixed(0)}`);
  }
  return parts.join(' · ');
}

export function MatchResultsTable({ segment, targetMetrics, results, isSearching }: MatchResultsTableProps) {
  const filesInResults = new Set(results.map((result) => result.corpusTrackId)).size;

  return (
    <section className="card">
      <p className="eyebrow" style={{ color: segment.color }}>
        {segment.name}
      </p>
      <h2>Tramos similares</h2>

      {isSearching && <p className="muted">Buscando…</p>}

      {!isSearching && results.length === 0 && (
        <p className="muted">Sin resultados todavía. Pulsa «Buscar tramos similares» en el tramo.</p>
      )}

      {!isSearching && results.length > 0 && (
        <>
          <p className="muted small-text">
            {results.length} tramos encontrados en {filesInResults} archivo{filesInResults === 1 ? '' : 's'} del corpus
            (un mismo archivo puede aportar varios tramos no solapados). El ritmo se compara contra el tramo objetivo
            ({formatPace(targetMetrics?.paceSecPerKm)}).
          </p>

          <div className="profile-legend">
            <span>
              <svg width={20} height={10} aria-hidden="true">
                <line x1={0} y1={5} x2={20} y2={5} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 2" />
              </svg>
              Objetivo
            </span>
            <span>
              <svg width={20} height={10} aria-hidden="true">
                <line x1={0} y1={5} x2={20} y2={5} stroke={segment.color} strokeWidth={2} />
              </svg>
              Candidato
            </span>
          </div>

          <div className="table-wrapper">
            <table className="results-table">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '10%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Archivo</th>
                  <th>Perfil</th>
                  <th>Tramo</th>
                  <th>Desnivel</th>
                  <th>Ritmo</th>
                  <th>Similitud</th>
                </tr>
              </thead>
              <tbody>
                {targetMetrics && (
                  <tr className="results-table__reference-row">
                    <td className="cell-ellipsis" style={{ borderLeft: `4px solid ${segment.color}` }} title={segment.name}>
                      {segment.name} (objetivo)
                    </td>
                    <td>
                      {targetMetrics.slopeProfile ? (
                        <MiniProfile
                          targetProfile={targetMetrics.slopeProfile}
                          candidateProfile={targetMetrics.slopeProfile}
                          color="#0f172a"
                          width={72}
                          height={28}
                        />
                      ) : (
                        <span className="muted small-text">—</span>
                      )}
                    </td>
                    <td className="small-text">
                      km {formatKm(segment.startKm)}–{formatKm(segment.endKm)}
                      <br />
                      {formatMeters(targetMetrics.distanceM)} m
                    </td>
                    <td className="small-text">
                      +{formatMeters(targetMetrics.elevationGainM)}/-{formatMeters(targetMetrics.elevationLossM)} m
                      <br />
                      {targetMetrics.avgSlopePercent.toFixed(1)}%
                    </td>
                    <td className="small-text">{targetMetrics.hasTimeData ? formatPace(targetMetrics.paceSecPerKm) : 'Sin datos'}</td>
                    <td>
                      <span className="pill">Ref.</span>
                    </td>
                  </tr>
                )}
                {results.map((result) => {
                  const paceDelta = comparePaceDelta(targetMetrics?.paceSecPerKm, result.metrics.paceSecPerKm);

                  return (
                    <tr key={result.id}>
                      <td className="cell-ellipsis" title={result.corpusTrackName}>
                        {result.corpusTrackName}
                      </td>
                      <td>
                        {targetMetrics?.slopeProfile && result.metrics.slopeProfile ? (
                          <MiniProfile
                            targetProfile={targetMetrics.slopeProfile}
                            candidateProfile={result.metrics.slopeProfile}
                            color={segment.color}
                            width={72}
                            height={28}
                          />
                        ) : (
                          <span className="muted small-text">—</span>
                        )}
                      </td>
                      <td className="small-text">
                        km {formatKm(result.startKm)}–{formatKm(result.endKm)}
                        <br />
                        {formatMeters(result.metrics.distanceM)} m
                      </td>
                      <td className="small-text">
                        +{formatMeters(result.metrics.elevationGainM)}/-{formatMeters(result.metrics.elevationLossM)} m
                        <br />
                        {result.metrics.avgSlopePercent.toFixed(1)}%
                      </td>
                      <td className="small-text">
                        {result.metrics.hasTimeData ? formatPace(result.metrics.paceSecPerKm) : 'Sin datos'}
                        {paceDelta && (
                          <>
                            <br />
                            <span className={`pace-delta pace-delta--${paceDelta.direction}`}>{formatPaceDeltaShort(paceDelta)}</span>
                          </>
                        )}
                      </td>
                      <td>
                        <span className="pill" title={scoreBreakdownTitle(result)}>
                          {Math.round(result.score.totalScore)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
