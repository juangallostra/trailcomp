import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SelectedSegment } from '../../domain/selectedSegment';
import type { TrackPoint } from '../../domain/trackPoint';
import { buildElevationProfile } from '../../services/elevationProfile';

interface ElevationProfileProps {
  points: TrackPoint[];
  segments?: SelectedSegment[];
  pendingStartKm?: number | null;
  hoveredKm?: number | null;
  height?: number;
  onHoverKm?: (km: number | null) => void;
  onClickKm?: (km: number) => void;
}

function toKmLabel(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function readActiveKm(chartState: unknown): number | null {
  const state = chartState as { activeLabel?: string | number; activePayload?: Array<{ payload?: { km?: number } }> };

  if (state?.activeLabel !== undefined) {
    const value = Number(state.activeLabel);
    return Number.isFinite(value) ? value : null;
  }

  const payloadKm = state?.activePayload?.[0]?.payload?.km;
  return typeof payloadKm === 'number' ? payloadKm : null;
}

export function ElevationProfile({
  points,
  segments = [],
  pendingStartKm,
  hoveredKm,
  height = 260,
  onHoverKm,
  onClickKm,
}: ElevationProfileProps) {
  const data = buildElevationProfile(points);

  if (data.length === 0) {
    return (
      <section className="card profile-card">
        <p className="eyebrow">Perfil</p>
        <h2>Perfil de elevación</h2>
        <p className="muted">Este track no tiene suficientes datos de elevación para mostrar un perfil.</p>
      </section>
    );
  }

  return (
    <section className="card profile-card">
      <div className="section-title-row">
        <div>
          <p className="eyebrow">Perfil</p>
          <h2>Perfil de elevación</h2>
          <p className="muted">Mueve el ratón para sincronizar el mapa. Haz clic para marcar inicio/fin de un tramo.</p>
        </div>
        {hoveredKm !== null && hoveredKm !== undefined && <span className="pill">Km {toKmLabel(hoveredKm)}</span>}
      </div>

      <div style={{ width: '100%', height }} onMouseLeave={() => onHoverKm?.(null)}>
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 12, right: 18, left: 0, bottom: 8 }}
            onMouseMove={(state) => onHoverKm?.(readActiveKm(state))}
            onClick={(state) => {
              const km = readActiveKm(state);
              if (km !== null) onClickKm?.(km);
            }}
          >
            <defs>
              <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.28} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="km" type="number" domain={[data[0].km, data[data.length - 1].km]} tickFormatter={(v) => Number(v).toFixed(1)} unit=" km" />
            <YAxis tickFormatter={(v) => `${Math.round(Number(v))}`} unit=" m" domain={['dataMin - 20', 'dataMax + 20']} />
            <Tooltip
              formatter={(value) => [`${Math.round(Number(value))} m`, 'Elevación']}
              labelFormatter={(label) => `Km ${toKmLabel(Number(label))}`}
            />

            {segments.map((segment) => (
              <ReferenceArea
                key={segment.id}
                x1={segment.startKm}
                x2={segment.endKm}
                fill={segment.color}
                fillOpacity={0.25}
                stroke={segment.color}
                strokeOpacity={0.6}
              />
            ))}

            {pendingStartKm !== null && pendingStartKm !== undefined && (
              <ReferenceLine x={pendingStartKm} stroke="#0f172a" strokeDasharray="4 4" />
            )}

            {hoveredKm !== null && hoveredKm !== undefined && (
              <ReferenceLine x={hoveredKm} className="profile-line--hover" strokeDasharray="3 3" />
            )}

            <Area type="monotone" dataKey="ele" stroke="currentColor" fill="url(#elevationFill)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
