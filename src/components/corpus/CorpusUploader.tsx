import type { ChangeEvent } from 'react';

interface CorpusUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

export function CorpusUploader({ onFilesSelected }: CorpusUploaderProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }

    event.target.value = '';
  }

  return (
    <section className="card uploader-card">
      <div>
        <p className="eyebrow">Corpus</p>
        <h2>Cargar tracks base</h2>
        <p className="muted">
          Selecciona uno o varios GPX (FIT próximamente) para buscar tramos similares en ellos. Sólo se guardan en
          esta sesión del navegador.
        </p>
      </div>

      <label className="file-input-label">
        <span>Seleccionar archivos</span>
        <input
          type="file"
          accept=".gpx,.fit,application/gpx+xml,text/xml,application/xml"
          multiple
          onChange={handleChange}
        />
      </label>
    </section>
  );
}
