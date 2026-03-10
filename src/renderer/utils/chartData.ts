import type { Workout, Segment, ChartPoint, WarmupSegment, SteadySegment, IntervalSegment, FreeRideSegment } from '../types/workout'

const SEGMENT_COLORS: Record<string, string> = {
  warmup: '#4ade80',
  cooldown: '#4ade80',
  ramp: '#60a5fa',
  steadystate: '#3b82f6',
  climb: '#f97316',
  interval: '#f43f5e',
  freeride: '#a78bfa'
}

export function getSegmentColor(type: string): string {
  return SEGMENT_COLORS[type] || '#94a3b8'
}

export function buildChartData(workout: Workout): ChartPoint[] {
  const points: ChartPoint[] = []
  let time = 0

  for (const seg of workout.segments) {
    const pts = segmentToPoints(seg, time)
    points.push(...pts)
    time += getSegmentDuration(seg)
  }

  return points
}

function getSegmentDuration(seg: Segment): number {
  switch (seg.type) {
    case 'interval': {
      const s = seg as IntervalSegment
      return s.repeat * (s.onDuration + s.offDuration)
    }
    case 'warmup':
    case 'cooldown':
    case 'ramp':
      return (seg as WarmupSegment).duration
    case 'steadystate':
    case 'climb':
      return (seg as SteadySegment).duration
    case 'freeride':
      return (seg as FreeRideSegment).duration
    default:
      return 0
  }
}

function segmentToPoints(seg: Segment, startTime: number): ChartPoint[] {
  switch (seg.type) {
    case 'warmup':
    case 'cooldown':
    case 'ramp': {
      const s = seg as WarmupSegment
      return [
        { time: startTime, power: s.powerLow * 100, type: seg.type },
        { time: startTime + s.duration, power: s.powerHigh * 100, type: seg.type }
      ]
    }

    case 'steadystate':
    case 'climb': {
      const s = seg as SteadySegment
      return [
        { time: startTime, power: s.power * 100, type: seg.type },
        { time: startTime + s.duration, power: s.power * 100, type: seg.type }
      ]
    }

    case 'interval': {
      const s = seg as IntervalSegment
      const pts: ChartPoint[] = []
      let t = startTime
      for (let i = 0; i < s.repeat; i++) {
        pts.push({ time: t, power: s.onPower * 100, type: seg.type, label: i === 0 ? `x${s.repeat}` : undefined })
        pts.push({ time: t + s.onDuration, power: s.onPower * 100, type: seg.type })
        pts.push({ time: t + s.onDuration, power: s.offPower * 100, type: seg.type })
        pts.push({ time: t + s.onDuration + s.offDuration, power: s.offPower * 100, type: seg.type })
        t += s.onDuration + s.offDuration
      }
      return pts
    }

    case 'freeride': {
      const s = seg as FreeRideSegment
      return [
        { time: startTime, power: 60, type: seg.type },
        { time: startTime + s.duration, power: 60, type: seg.type }
      ]
    }

    default:
      return []
  }
}
