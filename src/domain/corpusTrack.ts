import type { Track } from './trackPoint';

export type CorpusTrackStatus = 'parsing' | 'ready' | 'error';

export interface CorpusTrackItem {
  id: string;
  filename: string;
  status: CorpusTrackStatus;
  track?: Track;
  errorMessage?: string;
}
