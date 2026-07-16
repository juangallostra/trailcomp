import { useEffect, useMemo, useState } from 'react';
import type { CorpusTrackItem } from '../../domain/corpusTrack';
import type { MatchResult } from '../../domain/matchResult';
import type { SelectedSegment } from '../../domain/selectedSegment';
import { DEFAULT_SIMILARITY_CONFIG, type SimilarityConfig } from '../../domain/similarityConfig';
import type { Track, TrackPoint } from '../../domain/trackPoint';
import { calculateElevationStats } from '../../services/distanceCalculator';
import { colorForIndex, generateId } from '../../services/idUtils';
import { computeSegmentMetrics } from '../../services/segmentMetricsService';
import { findSimilarSegments } from '../../services/similaritySearch';
import { ingestFile, TrackIngestError } from '../../services/trackIngest';
import { CorpusFileList } from '../corpus/CorpusFileList';
import { CorpusUploader } from '../corpus/CorpusUploader';
import { PaceComparisonPanel } from '../pace/PaceComparisonPanel';
import { SegmentList } from '../segments/SegmentList';
import { MatchResultsTable } from '../similarity/MatchResultsTable';
import { SimilarityConfigPanel } from '../similarity/SimilarityConfigPanel';
import { ElevationProfile } from '../target/ElevationProfile';
import { MapPreview } from '../target/MapPreview';
import { TargetUploader } from '../target/TargetUploader';
import { TrackSummary } from '../target/TrackSummary';

const MIN_SEGMENT_KM = 0.01;

export function AppShell() {
  const [fileName, setFileName] = useState<string | undefined>();
  const [track, setTrack] = useState<Track | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);

  const [corpusItems, setCorpusItems] = useState<CorpusTrackItem[]>([]);

  const [segments, setSegments] = useState<SelectedSegment[]>([]);
  const [pendingStartKm, setPendingStartKm] = useState<number | null>(null);

  const [similarityConfig, setSimilarityConfig] = useState<SimilarityConfig>(DEFAULT_SIMILARITY_CONFIG);
  const [matchResultsBySegment, setMatchResultsBySegment] = useState<Record<string, MatchResult[]>>({});
  const [searchingSegmentIds, setSearchingSegmentIds] = useState<Set<string>>(new Set());
  const [resultsStale, setResultsStale] = useState(false);

  const points: TrackPoint[] = track?.points ?? [];
  const totalKm = points.length > 0 ? points[points.length - 1].distanceFromStart / 1000 : 0;
  const elevationStats = useMemo(() => calculateElevationStats(points), [points]);
  const corpusReadyCount = corpusItems.filter((item) => item.status === 'ready').length;

  function handleFileLoaded(nextFileName: string, nextTrack: Track) {
    setFileName(nextFileName);
    setTrack(nextTrack);
    setHoveredKm(null);
    setSegments([]);
    setPendingStartKm(null);
    setMatchResultsBySegment({});
    setError(undefined);
  }

  function handleError(message: string) {
    setError(message);
  }

  async function handleCorpusFilesSelected(files: File[]) {
    const newItems: CorpusTrackItem[] = files.map((file) => ({
      id: generateId('corpus'),
      filename: file.name,
      status: 'parsing',
    }));
    setCorpusItems((current) => [...current, ...newItems]);

    await Promise.all(
      files.map(async (file, index) => {
        const item = newItems[index];

        try {
          const parsedTrack = await ingestFile(file);
          setCorpusItems((current) =>
            current.map((existing) => (existing.id === item.id ? { ...existing, status: 'ready', track: parsedTrack } : existing)),
          );
        } catch (caughtError) {
          setCorpusItems((current) =>
            current.map((existing) =>
              existing.id === item.id
                ? {
                    ...existing,
                    status: 'error',
                    errorMessage:
                      caughtError instanceof TrackIngestError ? caughtError.message : 'No se ha podido procesar el archivo.',
                  }
                : existing,
            ),
          );
        }
      }),
    );
  }

  function handleRemoveCorpusItem(id: string) {
    setCorpusItems((current) => current.filter((item) => item.id !== id));
  }

  function handleTargetClickKm(km: number) {
    if (points.length === 0) return;

    if (pendingStartKm === null) {
      setPendingStartKm(km);
      return;
    }

    const startKm = Math.min(pendingStartKm, km);
    const endKm = Math.max(pendingStartKm, km);
    setPendingStartKm(null);

    if (endKm - startKm < MIN_SEGMENT_KM) {
      return;
    }

    setSegments((current) => [
      ...current,
      {
        id: generateId('seg'),
        name: `Tramo ${current.length + 1}`,
        startKm,
        endKm,
        color: colorForIndex(current.length),
      },
    ]);
  }

  function handleCancelPending() {
    setPendingStartKm(null);
  }

  function clearResultsFor(id: string) {
    setMatchResultsBySegment((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  function handleUpdateSegment(id: string, updates: Partial<Pick<SelectedSegment, 'name' | 'startKm' | 'endKm'>>) {
    let boundsChanged = false;

    setSegments((current) =>
      current.map((segment) => {
        if (segment.id !== id) return segment;

        const next = { ...segment, ...updates };

        if (updates.startKm !== undefined || updates.endKm !== undefined) {
          const startKm = Math.max(0, Math.min(next.startKm, totalKm));
          const endKm = Math.max(0, Math.min(next.endKm, totalKm));

          if (startKm >= endKm) {
            return segment;
          }

          if (startKm !== segment.startKm || endKm !== segment.endKm) {
            boundsChanged = true;
          }

          next.startKm = startKm;
          next.endKm = endKm;
        }

        return next;
      }),
    );

    if (boundsChanged) {
      clearResultsFor(id);
    }
  }

  function handleDeleteSegment(id: string) {
    setSegments((current) => current.filter((segment) => segment.id !== id));
    clearResultsFor(id);
    setSearchingSegmentIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }

  function runSearch(segment: SelectedSegment) {
    return findSimilarSegments(segment, points, corpusItems, similarityConfig);
  }

  function handleSearchSimilar(id: string) {
    const segment = segments.find((item) => item.id === id);
    if (!segment) return;

    setSearchingSegmentIds((current) => new Set(current).add(id));

    window.requestAnimationFrame(() => {
      const results = runSearch(segment);
      setMatchResultsBySegment((current) => ({ ...current, [id]: results }));
      setSearchingSegmentIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    });
  }

  function handleSimilarityConfigChange(nextConfig: SimilarityConfig) {
    setSimilarityConfig(nextConfig);
    if (Object.keys(matchResultsBySegment).length > 0) {
      setResultsStale(true);
    }
  }

  function recalculateAllResults() {
    setMatchResultsBySegment((current) => {
      const idsWithResults = Object.keys(current);
      if (idsWithResults.length === 0) return current;

      const next: Record<string, MatchResult[]> = {};
      for (const id of idsWithResults) {
        const segment = segments.find((item) => item.id === id);
        if (!segment) continue;
        next[id] = runSearch(segment);
      }
      return next;
    });
    setResultsStale(false);
  }

  // Recalcula automáticamente los tramos que ya tenían resultados cuando cambia el corpus (añadir/quitar
  // archivos). Los cambios de configuración de similitud, en cambio, requieren pulsar "Recalcular" a propósito.
  useEffect(() => {
    recalculateAllResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [corpusItems]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MVP · 100% cliente</p>
          <h1>TrailComp</h1>
          <p>
            Carga un corpus de GPX/FIT, selecciona tramos sobre un track objetivo y compara ritmo y tiempo frente a
            tramos similares.
          </p>
        </div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <TargetUploader onFileLoaded={handleFileLoaded} onError={handleError} />
      <TrackSummary fileName={fileName} points={points} meta={track?.meta} elevationStats={elevationStats} />

      <CorpusUploader onFilesSelected={handleCorpusFilesSelected} />
      <CorpusFileList items={corpusItems} onRemove={handleRemoveCorpusItem} />

      {points.length > 0 && (
        <>
          <MapPreview
            points={points}
            segments={segments}
            pendingStartKm={pendingStartKm}
            hoveredKm={hoveredKm}
            onHoverKm={setHoveredKm}
            onClickKm={handleTargetClickKm}
          />
          <ElevationProfile
            points={points}
            segments={segments}
            pendingStartKm={pendingStartKm}
            hoveredKm={hoveredKm}
            onHoverKm={setHoveredKm}
            onClickKm={handleTargetClickKm}
          />
          <SegmentList
            points={points}
            segments={segments}
            pendingStartKm={pendingStartKm}
            corpusReadyCount={corpusReadyCount}
            searchingSegmentIds={searchingSegmentIds}
            resultsCountBySegment={Object.fromEntries(Object.entries(matchResultsBySegment).map(([id, results]) => [id, results.length]))}
            onUpdateSegment={handleUpdateSegment}
            onDeleteSegment={handleDeleteSegment}
            onCancelPending={handleCancelPending}
            onSearchSimilar={handleSearchSimilar}
          />

          {segments.length > 0 && (
            <SimilarityConfigPanel
              config={similarityConfig}
              onChange={handleSimilarityConfigChange}
              hasResults={Object.keys(matchResultsBySegment).length > 0}
              isStale={resultsStale}
              onRecalculate={recalculateAllResults}
            />
          )}

          {segments.map((segment) => {
            if (matchResultsBySegment[segment.id] === undefined && !searchingSegmentIds.has(segment.id)) {
              return null;
            }

            const targetMetrics = computeSegmentMetrics(points, segment.startKm, segment.endKm, similarityConfig.resampleResolution);
            const results = matchResultsBySegment[segment.id] ?? [];

            return (
              <div key={segment.id}>
                {!searchingSegmentIds.has(segment.id) && results.length > 0 && (
                  <PaceComparisonPanel segment={segment} targetMetrics={targetMetrics} results={results} />
                )}
                <MatchResultsTable
                  segment={segment}
                  targetMetrics={targetMetrics}
                  results={results}
                  isSearching={searchingSegmentIds.has(segment.id)}
                />
              </div>
            );
          })}
        </>
      )}
    </main>
  );
}
