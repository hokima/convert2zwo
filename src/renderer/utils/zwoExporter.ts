import type { Workout, Segment, WarmupSegment, SteadySegment, IntervalSegment, FreeRideSegment } from '../types/workout'

function attr(obj: Record<string, string | number | undefined>): string {
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ')
}

function segmentToXml(seg: Segment): string {
  switch (seg.type) {
    case 'warmup':
    case 'cooldown': {
      const s = seg as WarmupSegment
      const tag = seg.type === 'warmup' ? 'Warmup' : 'Cooldown'
      return `    <${tag} ${attr({
        Duration: s.duration,
        PowerLow: s.powerLow.toFixed(3),
        PowerHigh: s.powerHigh.toFixed(3),
        ...(s.cadence ? { Cadence: s.cadence } : {})
      })}/>`
    }

    case 'ramp': {
      const s = seg as WarmupSegment
      return `    <Ramp ${attr({
        Duration: s.duration,
        PowerLow: s.powerLow.toFixed(3),
        PowerHigh: s.powerHigh.toFixed(3),
        ...(s.cadence ? { Cadence: s.cadence } : {})
      })}/>`
    }

    case 'steadystate':
    case 'climb': {
      const s = seg as SteadySegment
      return `    <SteadyState ${attr({
        Duration: s.duration,
        Power: s.power.toFixed(3),
        ...(s.cadence ? { Cadence: s.cadence } : {})
      })}/>`
    }

    case 'interval': {
      const s = seg as IntervalSegment
      return `    <IntervalsT ${attr({
        Repeat: s.repeat,
        OnDuration: s.onDuration,
        OffDuration: s.offDuration,
        OnPower: s.onPower.toFixed(3),
        OffPower: s.offPower.toFixed(3),
        ...(s.onCadence ? { Cadence: s.onCadence } : {}),
        ...(s.offCadence ? { CadenceResting: s.offCadence } : {})
      })}/>`
    }

    case 'freeride': {
      const s = seg as FreeRideSegment
      return `    <FreeRide ${attr({
        Duration: s.duration,
        ...(s.cadence ? { Cadence: s.cadence } : {})
      })}/>`
    }

    default:
      return ''
  }
}

export function workoutToZwo(workout: Workout): string {
  const segments = workout.segments.map(segmentToXml).filter(Boolean).join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<workout_file>
    <author>${escapeXml(workout.author || 'Convert2ZWO')}</author>
    <name>${escapeXml(workout.name)}</name>
    <description>${escapeXml(workout.description)}</description>
    <sportType>${workout.sport}</sportType>
    <tags/>
    <workout>
${segments}
    </workout>
</workout_file>`
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function getTotalDuration(workout: Workout): number {
  return workout.segments.reduce((total, seg) => {
    switch (seg.type) {
      case 'interval': {
        const s = seg as IntervalSegment
        return total + s.repeat * (s.onDuration + s.offDuration)
      }
      case 'warmup':
      case 'cooldown':
      case 'ramp':
        return total + (seg as WarmupSegment).duration
      case 'steadystate':
      case 'climb':
        return total + (seg as SteadySegment).duration
      case 'freeride':
        return total + (seg as FreeRideSegment).duration
      default:
        return total
    }
  }, 0)
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9א-ת \-_]/g, '').trim().replace(/\s+/g, '_') + '.zwo'
}
