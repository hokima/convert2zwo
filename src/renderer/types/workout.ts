export type SegmentType =
  | 'warmup'
  | 'cooldown'
  | 'steadystate'
  | 'interval'
  | 'ramp'
  | 'freeride'
  | 'climb' // heavy gears = low cadence SteadyState

export interface BaseSegment {
  id: string
  type: SegmentType
  notes?: string
  warning?: string // set by AI when uncertain
}

export interface WarmupSegment extends BaseSegment {
  type: 'warmup' | 'cooldown' | 'ramp'
  duration: number // seconds
  powerLow: number // fraction of FTP (0.5 = 50%)
  powerHigh: number
  cadence?: number
}

export interface SteadySegment extends BaseSegment {
  type: 'steadystate' | 'climb'
  duration: number // seconds
  power: number // fraction of FTP
  cadence?: number
}

export interface IntervalSegment extends BaseSegment {
  type: 'interval'
  repeat: number
  onDuration: number // seconds
  onPower: number
  onCadence?: number
  offDuration: number // seconds
  offPower: number
  offCadence?: number
}

export interface FreeRideSegment extends BaseSegment {
  type: 'freeride'
  duration: number
  cadence?: number
}

export type Segment = WarmupSegment | SteadySegment | IntervalSegment | FreeRideSegment

export interface Workout {
  name: string
  description: string
  sport: 'cycling' | 'running'
  author?: string
  segments: Segment[]
}

export interface ParseResult {
  workout: Workout
  rawText: string
  hasWarnings: boolean
}

// For the chart
export interface ChartPoint {
  time: number // seconds from start
  power: number // % FTP (0-200)
  type: SegmentType
  label?: string
}
