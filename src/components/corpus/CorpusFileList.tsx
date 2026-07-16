import type { CorpusTrackItem } from '../../domain/corpusTrack';

interface CorpusFileListProps {
  items: CorpusTrackItem[];
  onRemove: (id: string) => void;
}

function formatKm(meters: number): string {
  return (meters / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function CorpusFileList({ items, onRemove }: CorpusFileListProps) {
  return (
    <section className="card">
      <p className="eyebrow">Corpus</p>
      <h2>Tracks base ({items.length})</h2>

      {items.length === 0 ? (
        <p className="muted">Todavía no has añadido ningún track base.</p>
      ) : (
        <ul className="corpus-list">
          {items.map((item) => (
            <li key={item.id} className="corpus-item">
              <div className="corpus-item__main">
                <strong>{item.filename}</strong>
                {item.status === 'parsing' && <span className="pill">Procesando…</span>}
                {item.status === 'ready' && item.track && (
                  <span className="muted small-text">
                    {formatKm(item.track.meta.totalDistanceM)} km · {item.track.meta.pointCount.toLocaleString('es-ES')}{' '}
                    puntos
                    {item.track.meta.hasElevation ? '' : ' · sin elevación'}
                    {item.track.meta.hasTime ? '' : ' · sin tiempo'}
                  </span>
                )}
                {item.status === 'error' && <span className="inline-error small-text">{item.errorMessage}</span>}
              </div>
              <button type="button" className="button-secondary" onClick={() => onRemove(item.id)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
