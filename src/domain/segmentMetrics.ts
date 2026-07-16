export interface SegmentMetrics {
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  /** Pendiente neta (inicio->fin), en porcentaje. */
  avgSlopePercent: number;
  /** Perfil de elevación remuestreado a N puntos, para comparar la "forma" del tramo. */
  slopeProfile?: number[];
  durationSec?: number;
  paceSecPerKm?: number;
  hasTimeData: boolean;
  hasElevationData: boolean;
}
