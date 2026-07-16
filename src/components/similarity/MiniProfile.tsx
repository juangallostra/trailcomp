interface MiniProfileProps {
  targetProfile: number[];
  candidateProfile: number[];
  color: string;
  width?: number;
  height?: number;
}

function buildPath(values: number[], min: number, range: number, width: number, height: number, padding: number): string {
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  return values
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

/** Elevación relativa al inicio del propio tramo, no absoluta: dos tramos en montañas
 * distintas (altitudes de partida muy distintas) deben arrancar en el mismo punto del
 * gráfico para que la comparación de forma sea legible. */
function toRelativeProfile(profile: number[]): number[] {
  const base = profile[0];
  return profile.map((value) => value - base);
}

/**
 * Sparkline sin ejes: objetivo (gris, discontinuo) vs candidato (color del tramo, sólido).
 * Ambos perfiles comparten escala vertical para que una diferencia real de magnitud
 * (p.ej. un candidato mucho más suave) se vea, no sólo la forma.
 */
export function MiniProfile({ targetProfile, candidateProfile, color, width = 96, height = 32 }: MiniProfileProps) {
  const padding = 2;
  const relativeTarget = toRelativeProfile(targetProfile);
  const relativeCandidate = toRelativeProfile(candidateProfile);
  const allValues = [...relativeTarget, ...relativeCandidate];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const targetPath = buildPath(relativeTarget, min, range, width, height, padding);
  const candidatePath = buildPath(relativeCandidate, min, range, width, height, padding);
  const candidateAreaPath = `${candidatePath} L${(width - padding).toFixed(1)},${(height - padding).toFixed(1)} L${padding.toFixed(1)},${(height - padding).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Perfil de elevación del tramo comparado con el objetivo">
      <path d={candidateAreaPath} fill={color} fillOpacity={0.12} stroke="none" />
      <path d={targetPath} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="3 2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={candidatePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
