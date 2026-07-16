import type { SimilarityConfig, SimilarityWeights } from '../../domain/similarityConfig';

interface SimilarityConfigPanelProps {
  config: SimilarityConfig;
  onChange: (config: SimilarityConfig) => void;
  hasResults: boolean;
  isStale: boolean;
  onRecalculate: () => void;
}

const WEIGHT_LABELS: Array<{ key: keyof SimilarityWeights; label: string; hint: string }> = [
  { key: 'distance', label: 'Distancia', hint: 'Penaliza que la ventana candidata tenga una longitud distinta a la del tramo objetivo.' },
  { key: 'elevationGain', label: 'Desnivel +', hint: 'Penaliza una diferencia en metros de desnivel positivo (D+) acumulado en el tramo.' },
  { key: 'elevationLoss', label: 'Desnivel -', hint: 'Penaliza una diferencia en metros de desnivel negativo (D-) acumulado en el tramo.' },
  { key: 'avgSlope', label: 'Pendiente media', hint: 'Penaliza que la pendiente neta (inicio→fin) sea distinta a la del objetivo.' },
  {
    key: 'shape',
    label: 'Forma del perfil',
    hint: 'Penaliza que la variación local de la pendiente (repechos, rellanos) no se parezca a la del objetivo, más allá de los agregados anteriores.',
  },
];

export function SimilarityConfigPanel({ config, onChange, hasResults, isStale, onRecalculate }: SimilarityConfigPanelProps) {
  const totalWeight = Object.values(config.weights).reduce((sum, value) => sum + value, 0) || 1;

  function handleWeightChange(key: keyof SimilarityWeights, value: number) {
    onChange({ ...config, weights: { ...config.weights, [key]: value } });
  }

  return (
    <section className="card">
      <p className="eyebrow">Similitud</p>
      <h2>Configuración de búsqueda</h2>
      <p className="muted">
        Ajusta el peso de cada métrica. Los resultados ya calculados <strong>no</strong> se actualizan solos al
        cambiar estos valores — pulsa «Recalcular resultados» cuando quieras aplicarlos.
      </p>

      <div className="config-grid">
        {WEIGHT_LABELS.map(({ key, label, hint }) => (
          <label className="config-field" key={key}>
            {label} ({Math.round((config.weights[key] / totalWeight) * 100)}%)
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={config.weights[key]}
              onChange={(event) => handleWeightChange(key, Number(event.target.value))}
            />
            <span className="config-hint">{hint}</span>
          </label>
        ))}

        <label className="config-field">
          Tolerancia de distancia (±{Math.round(config.distanceToleranceRatio * 100)}%)
          <input
            type="range"
            min={0.05}
            max={0.4}
            step={0.01}
            value={config.distanceToleranceRatio}
            onChange={(event) => onChange({ ...config, distanceToleranceRatio: Number(event.target.value) })}
          />
          <span className="config-hint">
            Rango de longitudes que se prueban alrededor del tramo objetivo: con ±15%, se buscan ventanas de entre el
            85% y el 115% de su distancia.
          </span>
        </label>

        <label className="config-field">
          Umbral mínimo de similitud ({config.minScoreThreshold})
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={config.minScoreThreshold}
            onChange={(event) => onChange({ ...config, minScoreThreshold: Number(event.target.value) })}
          />
          <span className="config-hint">Los candidatos con una puntuación total por debajo de este valor no aparecen en los resultados.</span>
        </label>

        <label className="config-field">
          Nº máximo de resultados
          <input
            type="number"
            min={1}
            max={100}
            value={config.maxResults}
            onChange={(event) => onChange({ ...config, maxResults: Math.max(1, Number(event.target.value) || 1) })}
          />
          <span className="config-hint">Cuántos tramos similares como máximo se devuelven por tramo objetivo, ya ordenados por puntuación.</span>
        </label>
      </div>

      {hasResults && (
        <div className="config-recalculate-row">
          <button type="button" onClick={onRecalculate}>
            Recalcular resultados
          </button>
          {isStale ? (
            <span className="pace-delta pace-delta--slower">Hay cambios sin aplicar a los resultados actuales</span>
          ) : (
            <span className="muted small-text">Los resultados actuales ya reflejan esta configuración.</span>
          )}
        </div>
      )}
    </section>
  );
}
