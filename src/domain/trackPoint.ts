export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number;
  /** Epoch en milisegundos. */
  time?: number;
  /** Distancia acumulada desde el inicio del track, en metros. */
  distanceFromStart: number;
}

export interface TrackMeta {
  hasTime: boolean;
  hasElevation: boolean;
  source: 'gpx' | 'fit';
  pointCount: number;
  totalDistanceM: number;
}

export interface ElevationStats {
  positive: number;
  negative: number;
}

export interface Track {
  points: TrackPoint[];
  meta: TrackMeta;
}
