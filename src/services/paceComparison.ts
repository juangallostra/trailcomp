import type { MatchResult } from '../domain/matchResult';

export interface PaceComparisonStats {
  sampleSize: number;
  totalMatches: number;
  meanPaceSecPerKm: number;
  medianPaceSecPerKm: number;
  meanDurationSec: number;
}

export function computePaceComparison(results: MatchResult[]): PaceComparisonStats | undefined {
  const withTime = results.filter(
    (result): result is MatchResult & { metrics: { paceSecPerKm: number; durationSec: number } } =>
      result.metrics.hasTimeData && result.metrics.paceSecPerKm !== undefined && result.metrics.durationSec !== undefined,
  );

  if (withTime.length === 0) return undefined;

  const paces = withTime.map((result) => result.metrics.paceSecPerKm).sort((a, b) => a - b);
  const durations = withTime.map((result) => result.metrics.durationSec);

  const meanPaceSecPerKm = paces.reduce((sum, value) => sum + value, 0) / paces.length;
  const meanDurationSec = durations.reduce((sum, value) => sum + value, 0) / durations.length;

  const mid = Math.floor(paces.length / 2);
  const medianPaceSecPerKm = paces.length % 2 === 0 ? (paces[mid - 1] + paces[mid]) / 2 : paces[mid];

  return { sampleSize: withTime.length, totalMatches: results.length, meanPaceSecPerKm, medianPaceSecPerKm, meanDurationSec };
}

export interface PaceDelta {
  direction: 'faster' | 'slower' | 'equal';
  deltaSecPerKm: number;
  deltaPercent: number;
}

/** Compara `comparedPaceSecPerKm` contra una referencia (objetivo o media del corpus). */
export function comparePaceDelta(referencePaceSecPerKm: number | undefined, comparedPaceSecPerKm: number | undefined): PaceDelta | undefined {
  if (referencePaceSecPerKm === undefined || comparedPaceSecPerKm === undefined) return undefined;

  const deltaSec = comparedPaceSecPerKm - referencePaceSecPerKm;
  const direction = Math.abs(deltaSec) < 1 ? 'equal' : deltaSec > 0 ? 'slower' : 'faster';

  return {
    direction,
    deltaSecPerKm: Math.abs(deltaSec),
    deltaPercent: Math.abs((deltaSec / referencePaceSecPerKm) * 100),
  };
}

function formatDeltaPace(deltaSecPerKm: number): string {
  const totalSeconds = Math.round(deltaSecPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}/km`;
}

export function formatPaceDeltaShort(delta: PaceDelta): string {
  if (delta.direction === 'equal') return '≈ igual';
  const formatted = formatDeltaPace(delta.deltaSecPerKm);
  return delta.direction === 'slower' ? `+${formatted} lento` : `-${formatted} rápido`;
}

export function formatPaceDeltaWithPercent(delta: PaceDelta): string {
  if (delta.direction === 'equal') return '≈ igual';
  return `${formatPaceDeltaShort(delta)} (${delta.deltaPercent.toFixed(1)}%)`;
}
