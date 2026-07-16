export function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const SEGMENT_COLORS = ['#f97316', '#0ea5e9', '#a855f7', '#16a34a', '#dc2626', '#ca8a04'];

export function colorForIndex(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}
