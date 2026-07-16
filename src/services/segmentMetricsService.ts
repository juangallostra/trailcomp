import type { SegmentMetrics } from '../domain/segmentMetrics';
import type { TrackPoint } from '../domain/trackPoint';
import { pointsInRange } from './pointInterpolation';
import { resampleElevation } from './resampler';

export function computeSegmentMetrics(
  points: TrackPoint[],
  startKm: number,
  endKm: number,
  resampleResolution?: number,
): SegmentMetrics {
  const rangePoints = pointsInRange(points, startKm, endKm);
  const startPoint = rangePoints[0];
  const endPoint = rangePoints[rangePoints.length - 1];
  const distanceM = endPoint.distanceFromStart - startPoint.distanceFromStart;

  let elevationGainM = 0;
  let elevationLossM = 0;
  let hasElevationData = false;

  for (let index = 1; index < rangePoints.length; index += 1) {
    const previousEle = rangePoints[index - 1].ele;
    const currentEle = rangePoints[index].ele;
    if (previousEle === undefined || currentEle === undefined) continue;

    hasElevationData = true;
    const delta = currentEle - previousEle;
    if (delta > 0) elevationGainM += delta;
    else if (delta < 0) elevationLossM += Math.abs(delta);
  }

  const avgSlopePercent =
    hasElevationData && startPoint.ele !== undefined && endPoint.ele !== undefined && distanceM > 0
      ? ((endPoint.ele - startPoint.ele) / distanceM) * 100
      : 0;

  const hasTimeData = startPoint.time !== undefined && endPoint.time !== undefined;
  const durationSec = hasTimeData ? (endPoint.time! - startPoint.time!) / 1000 : undefined;
  const paceSecPerKm = hasTimeData && distanceM > 0 ? durationSec! / (distanceM / 1000) : undefined;

  const slopeProfile =
    resampleResolution && hasElevationData
      ? resampleElevation(rangePoints, 0, rangePoints.length - 1, resampleResolution)
      : undefined;

  return {
    distanceM,
    elevationGainM,
    elevationLossM,
    avgSlopePercent,
    slopeProfile,
    durationSec,
    paceSecPerKm,
    hasTimeData,
    hasElevationData,
  };
}
