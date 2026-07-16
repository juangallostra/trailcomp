import type { TrackPoint } from '../domain/trackPoint';

export class PointInterpolationError extends Error {}

function clonePointWithDistance(point: TrackPoint, distanceFromStart: number): TrackPoint {
  return {
    ...point,
    distanceFromStart,
  };
}

export function interpolatePoint(pointA: TrackPoint, pointB: TrackPoint, targetDistance: number): TrackPoint {
  const segmentDistance = pointB.distanceFromStart - pointA.distanceFromStart;

  if (segmentDistance <= 0) {
    return clonePointWithDistance(pointA, targetDistance);
  }

  const ratio = (targetDistance - pointA.distanceFromStart) / segmentDistance;
  const hasElevation = pointA.ele !== undefined && pointB.ele !== undefined;
  const hasTime = pointA.time !== undefined && pointB.time !== undefined;

  return {
    lat: pointA.lat + (pointB.lat - pointA.lat) * ratio,
    lon: pointA.lon + (pointB.lon - pointA.lon) * ratio,
    ele: hasElevation ? pointA.ele! + (pointB.ele! - pointA.ele!) * ratio : undefined,
    time: hasTime ? pointA.time! + (pointB.time! - pointA.time!) * ratio : undefined,
    distanceFromStart: targetDistance,
  };
}

export function getPointAtDistance(points: TrackPoint[], targetDistance: number): TrackPoint {
  if (points.length === 0) {
    throw new PointInterpolationError('No hay puntos de track para interpolar.');
  }

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (targetDistance <= firstPoint.distanceFromStart) {
    return clonePointWithDistance(firstPoint, targetDistance);
  }

  if (targetDistance >= lastPoint.distanceFromStart) {
    return clonePointWithDistance(lastPoint, targetDistance);
  }

  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1];
    const currentPoint = points[index];

    if (Math.abs(previousPoint.distanceFromStart - targetDistance) < 0.0001) {
      return clonePointWithDistance(previousPoint, targetDistance);
    }

    if (Math.abs(currentPoint.distanceFromStart - targetDistance) < 0.0001) {
      return clonePointWithDistance(currentPoint, targetDistance);
    }

    if (previousPoint.distanceFromStart < targetDistance && currentPoint.distanceFromStart > targetDistance) {
      return interpolatePoint(previousPoint, currentPoint, targetDistance);
    }
  }

  return clonePointWithDistance(lastPoint, targetDistance);
}

export function pointsInRange(points: TrackPoint[], startKm: number, endKm: number): TrackPoint[] {
  const startMeters = startKm * 1000;
  const endMeters = endKm * 1000;
  const startPoint = getPointAtDistance(points, startMeters);
  const endPoint = getPointAtDistance(points, endMeters);
  const innerPoints = points.filter(
    (point) => point.distanceFromStart > startMeters && point.distanceFromStart < endMeters,
  );

  return [startPoint, ...innerPoints, endPoint];
}

export function getClosestPoint(points: TrackPoint[], target: { lat: number; lon: number }): TrackPoint | undefined {
  if (points.length === 0) return undefined;

  let best = points[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const latDelta = point.lat - target.lat;
    const lonDelta = point.lon - target.lon;
    const score = latDelta * latDelta + lonDelta * lonDelta;

    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }

  return best;
}
