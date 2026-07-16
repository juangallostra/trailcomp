export interface SimilarityWeights {
  distance: number;
  elevationGain: number;
  elevationLoss: number;
  avgSlope: number;
  shape: number;
}

export interface SimilarityConfig {
  weights: SimilarityWeights;
  /** Tolerancia de longitud de ventana respecto al tramo objetivo, p.ej. 0.15 = ±15%. */
  distanceToleranceRatio: number;
  /** Multiplicadores de longitud de ventana a probar dentro de la tolerancia. */
  lengthMultipliers: number[];
  /** Paso de deslizamiento como fracción de la longitud de ventana. */
  windowStepRatio: number;
  /** Paso mínimo de deslizamiento, en metros. */
  minStepM: number;
  /** Nº de muestras para comparar la forma del perfil de elevación. */
  resampleResolution: number;
  minScoreThreshold: number;
  maxResults: number;
  /** Ratio de solape máximo permitido entre ventanas del mismo track (non-max suppression). */
  overlapSuppressionRatio: number;
}

export const DEFAULT_SIMILARITY_CONFIG: SimilarityConfig = {
  weights: {
    distance: 0.25,
    elevationGain: 0.25,
    elevationLoss: 0.15,
    avgSlope: 0.15,
    shape: 0.2,
  },
  distanceToleranceRatio: 0.15,
  lengthMultipliers: [0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15],
  windowStepRatio: 0.1,
  minStepM: 25,
  resampleResolution: 30,
  minScoreThreshold: 50,
  maxResults: 20,
  overlapSuppressionRatio: 0.5,
};
