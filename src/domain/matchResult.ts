import type { SegmentMetrics } from './segmentMetrics';

export interface ScoreBreakdown {
  distanceScore: number;
  elevationGainScore: number;
  elevationLossScore: number;
  avgSlopeScore: number;
  /** undefined si el peso de forma está a 0 o falta elevación en alguno de los dos lados. */
  shapeScore?: number;
  totalScore: number;
}

export interface MatchResult {
  id: string;
  targetSegmentId: string;
  corpusTrackId: string;
  corpusTrackName: string;
  startKm: number;
  endKm: number;
  metrics: SegmentMetrics;
  score: ScoreBreakdown;
}
