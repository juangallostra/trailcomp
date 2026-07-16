import type { ChangeEvent } from 'react';
import type { Track } from '../../domain/trackPoint';
import { ingestFile, TrackIngestError } from '../../services/trackIngest';

interface TargetUploaderProps {
  onFileLoaded: (fileName: string, track: Track) => void;
  onError: (message: string) => void;
}

export function TargetUploader({ onFileLoaded, onError }: TargetUploaderProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const track = await ingestFile(file);
      onFileLoaded(file.name, track);
    } catch (caughtError) {
      onError(caughtError instanceof TrackIngestError ? caughtError.message : 'No se ha podido procesar el archivo.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="card uploader-card">
      <div>
        <p className="eyebrow">Objetivo</p>
        <h2>Cargar track a analizar</h2>
        <p className="muted">Selecciona un GPX (FIT próximamente). Todo el procesamiento se realiza en el navegador.</p>
      </div>

      <label className="file-input-label">
        <span>Seleccionar archivo</span>
        <input type="file" accept=".gpx,.fit,application/gpx+xml,text/xml,application/xml" onChange={handleFileChange} />
      </label>
    </section>
  );
}
