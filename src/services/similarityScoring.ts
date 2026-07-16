import type { ScoreBreakdown } from '../domain/matchResult';
import type { SegmentMetrics } from '../domain/segmentMetrics';
import type { SimilarityConfig } from '../domain/similarityConfig';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Invariante a offset/escala: dos tramos con distinta altitud de partida pero misma "forma" puntúan alto. */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;

  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;

  let numerator = 0;
  let denomA = 0;
  let denomB = 0;

  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    numerator += da * db;
    denomA += da * da;
    denomB += db * db;
  }

  const denominator = Math.sqrt(denomA * denomB);
  if (denominator === 0) return denomA === 0 && denomB === 0 ? 1 : 0;
  return numerator / denominator;
}

/**
 * Diferencia consecutiva de un perfil remuestreado: aproxima el gradiente local
 * (cómo varía la pendiente punto a punto), no la elevación absoluta.
 */
function toGradient(profile: number[]): number[] {
  const gradient: number[] = [];
  for (let i = 1; i < profile.length; i += 1) {
    gradient.push(profile[i] - profile[i - 1]);
  }
  return gradient;
}

export function computeScore(
  targetLengthM: number,
  candidateLengthM: number,
  target: SegmentMetrics,
  candidate: SegmentMetrics,
  config: SimilarityConfig,
): ScoreBreakdown {
  const distanceScore =
    100 * clamp01(1 - Math.abs(candidateLengthM - targetLengthM) / (targetLengthM * config.distanceToleranceRatio));
  const elevationGainScore =
    100 * clamp01(1 - Math.abs(candidate.elevationGainM - target.elevationGainM) / Math.max(target.elevationGainM, 15));
  const elevationLossScore =
    100 * clamp01(1 - Math.abs(candidate.elevationLossM - target.elevationLossM) / Math.max(target.elevationLossM, 15));
  const avgSlopeScore =
    100 *
    clamp01(
      1 - Math.abs(candidate.avgSlopePercent - target.avgSlopePercent) / Math.max(Math.abs(target.avgSlopePercent), 1.5),
    );

  let shapeScore: number | undefined;
  if (config.weights.shape > 0 && target.slopeProfile && candidate.slopeProfile) {
    // Correlación sobre el GRADIENTE (variación local de pendiente), no sobre la elevación
    // absoluta: dos perfiles que simplemente "suben" correlacionan casi siempre alto si se
    // compara la elevación en sí (invariante de escala + tendencia monótona compartida).
    // Comparando cómo varía la pendiente punto a punto sí distingue una rampa uniforme de
    // un perfil con repechos/rellanos, o una subida suave de una muy empinada.
    const correlation = pearsonCorrelation(toGradient(target.slopeProfile), toGradient(candidate.slopeProfile));
    shapeScore = 100 * clamp01((correlation + 1) / 2);
  }

  const weightedScores: Array<[number, number]> = [
    [config.weights.distance, distanceScore],
    [config.weights.elevationGain, elevationGainScore],
    [config.weights.elevationLoss, elevationLossScore],
    [config.weights.avgSlope, avgSlopeScore],
  ];
  if (shapeScore !== undefined) {
    weightedScores.push([config.weights.shape, shapeScore]);
  }

  const totalWeight = weightedScores.reduce((sum, [weight]) => sum + weight, 0) || 1;
  // Media geométrica ponderada, no aritmética: un único componente flojo (p.ej. desnivel muy
  // distinto) hunde el total en vez de quedar "diluido" por los demás componentes altos.
  const totalScore =
    100 *
    weightedScores.reduce((product, [weight, score]) => product * Math.pow(clamp01(score / 100), weight / totalWeight), 1);

  return { distanceScore, elevationGainScore, elevationLossScore, avgSlopeScore, shapeScore, totalScore };
}
