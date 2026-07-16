import type { TrackPoint } from '../domain/trackPoint';

/**
 * Remuestrea la elevación de points[startIdx..endIdx] a `resolution` muestras equiespaciadas
 * por distancia. `idx` avanza monótonamente con la distancia objetivo (two-pointer), por lo que
 * el coste es O(resolution) amortizado, no O(resolution * rango).
 */
export function resampleElevation(
  points: TrackPoint[],
  startIdx: number,
  endIdx: number,
  resolution: number,
): number[] | undefined {
  if (resolution < 2 || endIdx <= startIdx) return undefined;

  const startDistance = points[startIdx].distanceFromStart;
  const endDistance = points[endIdx].distanceFromStart;
  const span = endDistance - startDistance;
  if (span <= 0) return undefined;

  const samples: number[] = [];
  let idx = startIdx;

  for (let i = 0; i < resolution; i += 1) {
    const ratio = i / (resolution - 1);
    const targetDistance = startDistance + ratio * span;

    while (idx < endIdx - 1 && points[idx + 1].distanceFromStart < targetDistance) {
      idx += 1;
    }

    const a = points[idx];
    const b = points[Math.min(idx + 1, endIdx)];
    if (a.ele === undefined || b.ele === undefined) return undefined;

    const segmentSpan = b.distanceFromStart - a.distanceFromStart;
    const localRatio = segmentSpan > 0 ? (targetDistance - a.distanceFromStart) / segmentSpan : 0;
    samples.push(a.ele + (b.ele - a.ele) * localRatio);
  }

  return samples;
}
