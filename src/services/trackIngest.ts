import type { Track, TrackMeta } from '../domain/trackPoint';
import {
  calculateDistances,
  hasEnoughElevationData,
  hasEnoughTimeData,
} from './distanceCalculator';
import { parseGpx } from './gpxParser';

export class TrackIngestError extends Error {}

function detectSource(fileName: string): 'gpx' | 'fit' {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.gpx')) return 'gpx';
  if (lower.endsWith('.fit')) return 'fit';
  throw new TrackIngestError(`Formato de archivo no soportado: ${fileName}. Usa .gpx o .fit.`);
}

function buildTrackMeta(source: 'gpx' | 'fit', points: Track['points']): TrackMeta {
  return {
    hasTime: hasEnoughTimeData(points),
    hasElevation: hasEnoughElevationData(points),
    source,
    pointCount: points.length,
    totalDistanceM: points.length > 0 ? points[points.length - 1].distanceFromStart : 0,
  };
}

export async function ingestFile(file: File): Promise<Track> {
  const source = detectSource(file.name);

  if (source === 'fit') {
    throw new TrackIngestError('El soporte de archivos FIT todavía no está implementado.');
  }

  const xml = await file.text();
  const rawPoints = parseGpx(xml);

  if (rawPoints.length < 2) {
    throw new TrackIngestError('El GPX necesita al menos dos puntos de track para poder calcular distancia.');
  }

  const points = calculateDistances(rawPoints);
  return { points, meta: buildTrackMeta(source, points) };
}
