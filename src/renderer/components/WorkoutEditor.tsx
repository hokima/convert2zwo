import React from 'react'
import type {
  Workout, Segment, WarmupSegment, SteadySegment, IntervalSegment, FreeRideSegment, SegmentType
} from '../types/workout'
import { getSegmentColor } from '../utils/chartData'

import { v4 as uuidv4 } from 'uuid'

interface Props {
  workout: Workout
  onChange: (workout: Workout) => void
}

const TYPE_LABELS: Record<SegmentType, string> = {
  warmup: 'חימום',
  cooldown: 'התאוששות',
  steadystate: 'קצב קבוע',
  ramp: 'רמפה',
  interval: 'אינטרוול',
  climb: 'ילוכים קשים',
  freeride: 'חופשי'
}

function SegmentRow({ seg, index: _index, onUpdate, onDelete, onMove }: {
  seg: Segment
  index: number
  onUpdate: (seg: Segment) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const color = getSegmentColor(seg.type)

  const updateField = (field: string, value: string | number) => {
    onUpdate({ ...seg, [field]: value } as Segment)
  }

  return (
    <div className={`bg-zwift-card rounded-lg border ${seg.warning ? 'border-yellow-500/50' : 'border-zwift-border'} p-3`}>
      <div className="flex items-start gap-3">
        {/* Color dot + type */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <select
            value={seg.type}
            onChange={(e) => updateField('type', e.target.value)}
            className="bg-transparent text-sm font-medium text-white border-none outline-none cursor-pointer"
            style={{ color }}
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-zwift-dark text-white">{v}</option>
            ))}
          </select>
        </div>

        {/* Fields by type */}
        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <SegmentFields seg={seg} onUpdate={onUpdate} />
        </div>

        {/* Actions */}
        <div className="flex gap-1 ml-2">
          <button onClick={() => onMove(-1)} className="text-gray-600 hover:text-gray-300 px-1">↑</button>
          <button onClick={() => onMove(1)} className="text-gray-600 hover:text-gray-300 px-1">↓</button>
          <button onClick={onDelete} className="text-red-700 hover:text-red-400 px-1">✕</button>
        </div>
      </div>

      {seg.warning && (
        <div className="mt-2 text-xs text-yellow-400 bg-yellow-400/10 rounded px-2 py-1">
          ⚠ {seg.warning}
        </div>
      )}
      {seg.notes && (
        <div className="mt-1 text-xs text-gray-600 italic">{seg.notes}</div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'number', step }: {
  label: string
  value: number | string
  onChange: (v: string) => void
  type?: string
  step?: number
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zwift-darker border border-zwift-border rounded px-2 py-1 text-white text-sm w-full outline-none focus:border-orange-500"
      />
    </div>
  )
}

function SegmentFields({ seg, onUpdate }: { seg: Segment; onUpdate: (s: Segment) => void }) {
  const u = (field: string, v: string) => onUpdate({ ...seg, [field]: Number(v) } as Segment)

  switch (seg.type) {
    case 'warmup':
    case 'cooldown':
    case 'ramp': {
      const s = seg as WarmupSegment
      return <>
        <Field label="משך (שניות)" value={s.duration} onChange={(v) => u('duration', v)} />
        <Field label="FTP מ-%" value={Math.round(s.powerLow * 100)} onChange={(v) => onUpdate({ ...s, powerLow: Number(v) / 100 })} />
        <Field label="FTP עד-%" value={Math.round(s.powerHigh * 100)} onChange={(v) => onUpdate({ ...s, powerHigh: Number(v) / 100 })} />
        <Field label="קדנס (rpm)" value={s.cadence ?? ''} onChange={(v) => onUpdate({ ...s, cadence: v ? Number(v) : undefined })} />
      </>
    }
    case 'steadystate':
    case 'climb': {
      const s = seg as SteadySegment
      return <>
        <Field label="משך (שניות)" value={s.duration} onChange={(v) => u('duration', v)} />
        <Field label="% FTP" value={Math.round(s.power * 100)} onChange={(v) => onUpdate({ ...s, power: Number(v) / 100 })} />
        <Field label="קדנס (rpm)" value={s.cadence ?? ''} onChange={(v) => onUpdate({ ...s, cadence: v ? Number(v) : undefined })} />
      </>
    }
    case 'interval': {
      const s = seg as IntervalSegment
      return <>
        <Field label="חזרות" value={s.repeat} onChange={(v) => u('repeat', v)} />
        <Field label="ON שניות" value={s.onDuration} onChange={(v) => u('onDuration', v)} />
        <Field label="ON % FTP" value={Math.round(s.onPower * 100)} onChange={(v) => onUpdate({ ...s, onPower: Number(v) / 100 })} />
        <Field label="ON קדנס" value={s.onCadence ?? ''} onChange={(v) => onUpdate({ ...s, onCadence: v ? Number(v) : undefined })} />
        <Field label="OFF שניות" value={s.offDuration} onChange={(v) => u('offDuration', v)} />
        <Field label="OFF % FTP" value={Math.round(s.offPower * 100)} onChange={(v) => onUpdate({ ...s, offPower: Number(v) / 100 })} />
        <Field label="OFF קדנס" value={s.offCadence ?? ''} onChange={(v) => onUpdate({ ...s, offCadence: v ? Number(v) : undefined })} />
      </>
    }
    case 'freeride': {
      const s = seg as FreeRideSegment
      return <>
        <Field label="משך (שניות)" value={s.duration} onChange={(v) => u('duration', v)} />
        <Field label="קדנס (rpm)" value={s.cadence ?? ''} onChange={(v) => onUpdate({ ...s, cadence: v ? Number(v) : undefined })} />
      </>
    }
  }
}

function newSegment(): Segment {
  return { id: uuidv4(), type: 'steadystate', duration: 300, power: 0.75 } as SteadySegment
}

export function WorkoutEditor({ workout, onChange }: Props) {
  const updateMeta = (field: keyof Workout, value: string) => {
    onChange({ ...workout, [field]: value })
  }

  const updateSegment = (index: number, seg: Segment) => {
    const segments = [...workout.segments]
    segments[index] = seg
    onChange({ ...workout, segments })
  }

  const deleteSegment = (index: number) => {
    onChange({ ...workout, segments: workout.segments.filter((_, i) => i !== index) })
  }

  const moveSegment = (index: number, dir: -1 | 1) => {
    const segs = [...workout.segments]
    const target = index + dir
    if (target < 0 || target >= segs.length) return
    ;[segs[index], segs[target]] = [segs[target], segs[index]]
    onChange({ ...workout, segments: segs })
  }

  const addSegment = () => {
    onChange({ ...workout, segments: [...workout.segments, newSegment()] })
  }

  const hasWarnings = workout.segments.some((s) => s.warning)

  return (
    <div className="flex flex-col gap-4">
      {/* Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">שם האימון</label>
          <input
            value={workout.name}
            onChange={(e) => updateMeta('name', e.target.value)}
            className="w-full bg-zwift-card border border-zwift-border rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">תיאור</label>
          <input
            value={workout.description}
            onChange={(e) => updateMeta('description', e.target.value)}
            className="w-full bg-zwift-card border border-zwift-border rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {hasWarnings && (
        <div className="bg-yellow-400/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-400">
          ⚠ AI לא היה בטוח בחלק מהשלבים (מסומנים בצהוב). אנא בדוק ואשר.
        </div>
      )}

      {/* Segments */}
      <div className="flex flex-col gap-2">
        {workout.segments.map((seg, i) => (
          <SegmentRow
            key={seg.id}
            seg={seg}
            index={i}
            onUpdate={(s) => updateSegment(i, s)}
            onDelete={() => deleteSegment(i)}
            onMove={(dir) => moveSegment(i, dir)}
          />
        ))}
      </div>

      <button
        onClick={addSegment}
        className="w-full border-2 border-dashed border-zwift-border rounded-lg py-2 text-gray-500 hover:border-orange-500 hover:text-orange-400 text-sm transition-colors"
      >
        + הוסף שלב
      </button>
    </div>
  )
}
