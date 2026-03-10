import { useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import type { Workout } from '../types/workout'
import { buildChartData } from '../utils/chartData'
import { formatDuration, getTotalDuration } from '../utils/zwoExporter'

interface Props {
  workout: Workout
}

const FTP_ZONES = [
  { label: 'Z1', max: 55, color: '#94a3b8' },
  { label: 'Z2', max: 75, color: '#4ade80' },
  { label: 'Z3', max: 90, color: '#facc15' },
  { label: 'Z4', max: 105, color: '#f97316' },
  { label: 'Z5', max: 120, color: '#ef4444' },
  { label: 'Z6+', max: 200, color: '#a855f7' }
]

function getZoneColor(power: number): string {
  const zone = FTP_ZONES.find((z) => power <= z.max)
  return zone?.color || '#a855f7'
}

export function WorkoutChart({ workout }: Props) {
  const data = useMemo(() => buildChartData(workout), [workout])
  const totalDuration = useMemo(() => getTotalDuration(workout), [workout])

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null
    const { time, power } = payload[0].payload
    return (
      <div className="bg-zwift-card border border-zwift-border rounded-lg px-3 py-2 text-sm">
        <p className="text-gray-400">{formatDuration(Math.round(time))}</p>
        <p className="font-bold" style={{ color: getZoneColor(power) }}>{Math.round(power)}% FTP</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">תצוגה מקדימה</h3>
        <span className="text-sm text-gray-500">סה"כ: {formatDuration(totalDuration)}</span>
      </div>

      <div className="bg-zwift-card rounded-xl p-4 border border-zwift-border">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F26522" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#F26522" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              type="number"
              domain={[0, totalDuration]}
              tickFormatter={(v) => formatDuration(Math.round(v))}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#2a2a4a' }}
            />
            <YAxis
              domain={[0, 160]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Zone lines */}
            {[55, 75, 90, 105, 120].map((z) => (
              <ReferenceLine key={z} y={z} stroke="#2a2a4a" strokeDasharray="3 3" />
            ))}
            <ReferenceLine y={100} stroke="#F26522" strokeDasharray="5 3" strokeOpacity={0.4} label={{ value: 'FTP', fill: '#F26522', fontSize: 10 }} />
            <Area
              type="linear"
              dataKey="power"
              stroke="#F26522"
              strokeWidth={2}
              fill="url(#powerGrad)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Zone legend */}
        <div className="flex gap-3 mt-3 justify-center flex-wrap">
          {FTP_ZONES.map((z) => (
            <div key={z.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: z.color }} />
              <span className="text-xs text-gray-500">{z.label} &lt;{z.max}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
