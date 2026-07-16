import type { CorpusTrackItem } from '../domain/corpusTrack';
import type { MatchResult } from '../domain/matchResult';
import type { SegmentMetrics } from '../domain/segmentMetrics';
import type { SelectedSegment } from '../domain/selectedSegment';
import type { SimilarityConfig } from '../domain/similarityConfig';
import type { TrackPoint } from '../domain/trackPoint';
import { generateId } from './idUtils';
import { resampleElevation } from './resampler';
import { computeSegmentMetrics } from './segmentMetricsService';
import { computeScore } from './similarityScoring';

interface PreparedTrack {
  id: string;
  filename: string;
  points: TrackPoint[];
  gainPrefix: number[];
  lossPrefix: number[];
}

interface Candidate {
  corpusTrackId: string;
  corpusTrackName: string;
  startKm: number;
  endKm: number;
  metrics: SegmentMetrics;
  totalScore: number;
  breakdown: ReturnType<typeof computeScore>;
}

function prepareTrack(item: CorpusTrackItem): PreparedTrack | undefined {
  if (item.status !== 'ready' || !item.track || item.track.points.length < 2) return undefined;

  const points = item.track.points;
  const gainPrefix = new Array<number>(points.length).fill(0);
  const lossPrefix = new Array<number>(points.length).fill(0);

  for (let i = 1; i < points.length; i += 1) {
    gainPrefix[i] = gainPrefix[i - 1];
    lossPrefix[i] = lossPrefix[i - 1];

    const previousEle = points[i - 1].ele;
    const currentEle = points[i].ele;
    if (previousEle === undefined || currentEle === undefined) continue;

    const delta = currentEle - previousEle;
    if (delta > 0) gainPrefix[i] += delta;
    else if (delta < 0) lossPrefix[i] += Math.abs(delta);
  }

  return { id: item.id, filename: item.filename, points, gainPrefix, lossPrefix };
}

interface WindowIndexRange {
  startIdx: number;
  endIdx: number;
}

/** Two-pointer: para una longitud de ventana fija, recorre el track una sola vez (amortizado O(n)). */
function generateWindows(prepared: PreparedTrack, windowLengthM: number, stepM: number): WindowIndexRange[] {
  const { points } = prepared;
  const totalDistanceM = points[points.length - 1].distanceFromStart;
  if (windowLengthM <= 0 || totalDistanceM < windowLengthM) return [];

  const windows: WindowIndexRange[] = [];
  let endIdx = 0;
  let nextStartDistance = 0;

  for (let startIdx = 0; startIdx < points.length; startIdx += 1) {
    const startDistance = points[startIdx].distanceFromStart;
    if (startDistance < nextStartDistance) continue;

    const targetEndDistance = startDistance + windowLengthM;
    if (targetEndDistance > totalDistanceM) break;

    if (endIdx < startIdx) endIdx = startIdx;
    while (endIdx < points.length - 1 && points[endIdx].distanceFromStart < targetEndDistance) {
      endIdx += 1;
    }

    windows.push({ startIdx, endIdx });
    nextStartDistance = startDistance + stepM;
  }

  return windows;
}

function computeWindowMetrics(
  prepared: PreparedTrack,
  window: WindowIndexRange,
  resampleResolution: number,
): { startKm: number; endKm: number; metrics: SegmentMetrics } {
  const { points, gainPrefix, lossPrefix } = prepared;
  const startPoint = points[window.startIdx];
  const endPoint = points[window.endIdx];
  const distanceM = endPoint.distanceFromStart - startPoint.distanceFromStart;
  const elevationGainM = gainPrefix[window.endIdx] - gainPrefix[window.startIdx];
  const elevationLossM = lossPrefix[window.endIdx] - lossPrefix[window.startIdx];
  const hasElevationData = startPoint.ele !== undefined && endPoint.ele !== undefined;
  const avgSlopePercent =
    hasElevationData && distanceM > 0 ? ((endPoint.ele! - startPoint.ele!) / distanceM) * 100 : 0;
  const hasTimeData = startPoint.time !== undefined && endPoint.time !== undefined;
  const durationSec = hasTimeData ? (endPoint.time! - startPoint.time!) / 1000 : undefined;
  const paceSecPerKm = hasTimeData && distanceM > 0 ? durationSec! / (distanceM / 1000) : undefined;
  // Se calcula siempre que haya elevación (no sólo si el peso de "forma" > 0): además de puntuar,
  // alimenta la mini-preview visual del perfil en la tabla de resultados.
  const slopeProfile = hasElevationData
    ? resampleElevation(points, window.startIdx, window.endIdx, resampleResolution)
    : undefined;

  return {
    startKm: startPoint.distanceFromStart / 1000,
    endKm: endPoint.distanceFromStart / 1000,
    metrics: { distanceM, elevationGainM, elevationLossM, avgSlopePercent, slopeProfile, durationSec, paceSecPerKm, hasTimeData, hasElevationData },
  };
}

function overlapRatio(aStartKm: number, aEndKm: number, bStartKm: number, bEndKm: number): number {
  const overlapStart = Math.max(aStartKm, bStartKm);
  const overlapEnd = Math.min(aEndKm, bEndKm);
  const overlapLength = Math.max(0, overlapEnd - overlapStart);
  if (overlapLength === 0) return 0;

  const minLength = Math.min(aEndKm - aStartKm, bEndKm - bStartKm);
  return minLength > 0 ? overlapLength / minLength : 0;
}

export function findSimilarSegments(
  targetSegment: SelectedSegment,
  targetPoints: TrackPoint[],
  corpusItems: CorpusTrackItem[],
  config: SimilarityConfig,
): MatchResult[] {
  const targetMetrics = computeSegmentMetrics(
    targetPoints,
    targetSegment.startKm,
    targetSegment.endKm,
    config.resampleResolution,
  );
  const targetLengthM = targetMetrics.distanceM;
  if (targetLengthM <= 0) return [];

  const preparedTracks = corpusItems.map(prepareTrack).filter((track): track is PreparedTrack => track !== undefined);

  const candidates: Candidate[] = [];

  for (const prepared of preparedTracks) {
    for (const multiplier of config.lengthMultipliers) {
      const windowLengthM = targetLengthM * multiplier;
      const stepM = Math.max(config.minStepM, windowLengthM * config.windowStepRatio);
      const windows = generateWindows(prepared, windowLengthM, stepM);

      for (const window of windows) {
        const { startKm, endKm, metrics } = computeWindowMetrics(prepared, window, config.resampleResolution);
        const breakdown = computeScore(targetLengthM, metrics.distanceM, targetMetrics, metrics, config);

        if (breakdown.totalScore < config.minScoreThreshold) continue;

        candidates.push({
          corpusTrackId: prepared.id,
          corpusTrackName: prepared.filename,
          startKm,
          endKm,
          metrics,
          totalScore: breakdown.totalScore,
          breakdown,
        });
      }
    }
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);

  const accepted: Candidate[] = [];
  for (const candidate of candidates) {
    if (accepted.length >= config.maxResults) break;

    const overlapsAccepted = accepted.some(
      (existing) =>
        existing.corpusTrackId === candidate.corpusTrackId &&
        overlapRatio(existing.startKm, existing.endKm, candidate.startKm, candidate.endKm) > config.overlapSuppressionRatio,
    );

    if (!overlapsAccepted) {
      accepted.push(candidate);
    }
  }

  return accepted.map((candidate) => ({
    id: generateId('match'),
    targetSegmentId: targetSegment.id,
    corpusTrackId: candidate.corpusTrackId,
    corpusTrackName: candidate.corpusTrackName,
    startKm: candidate.startKm,
    endKm: candidate.endKm,
    metrics: candidate.metrics,
    score: candidate.breakdown,
  }));
}
