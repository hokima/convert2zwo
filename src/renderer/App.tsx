import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { ImageUpload } from './components/ImageUpload'
import { WorkoutEditor } from './components/WorkoutEditor'
import { WorkoutChart } from './components/WorkoutChart'
import { parseWorkoutFromImage, parseWeeklyWorkouts } from './utils/claudeParser'
import { workoutToZwo, sanitizeFilename } from './utils/zwoExporter'
import type { Workout } from './types/workout'

type Step = 'upload' | 'select' | 'review' | 'export'
type ParseStatus = 'idle' | 'loading' | 'done' | 'error'

const DEFAULT_WORKOUT: Workout = {
  name: 'אימון חדש',
  description: '',
  sport: 'cycling',
  segments: []
}

const ALL_DAYS = ['שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

// Canvas crop of a single day's column from the full image (RTL table)
const DayImageCrop = memo(function DayImageCrop({ src, dayIndex, displayHeight = 110 }: { src: string; dayIndex: number; displayHeight?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const totalDays = ALL_DAYS.length

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const colW = Math.floor(img.width / totalDays)
      const srcX = img.width - (dayIndex + 1) * colW // RTL: index 0 = rightmost
      const displayW = Math.max(80, Math.round(colW * displayHeight / img.height))
      canvas.height = displayHeight
      canvas.width = displayW
      ctx.drawImage(img, srcX, 0, colW, img.height, 0, 0, displayW, displayHeight)
    }
    img.src = src
    return () => { img.onload = null }
  }, [src, dayIndex, displayHeight])

  return <canvas ref={canvasRef} className="rounded-md border border-zwift-border" />
})

export default function App() {
  const [step, setStep] = useState<Step>('upload')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [image, setImage] = useState<{ base64: string; mediaType: 'image/jpeg' | 'image/png'; preview: string } | null>(null)
  const [workout, setWorkout] = useState<Workout>(DEFAULT_WORKOUT)
  const [parseStatus, setParseStatus] = useState<ParseStatus>('idle')
  const [parseError, setParseError] = useState<string>('')
  const [zwiftPath, setZwiftPath] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [exportMessage, setExportMessage] = useState('')
  const [dayLabel, setDayLabel] = useState('')
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<Array<{ day: string; workout: Workout }>>([])
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set())
  const [preDays, setPreDays] = useState<Set<string>>(new Set(ALL_DAYS)) // days to parse
  const [bulkExportStatus, setBulkExportStatus] = useState<'idle' | 'saving' | 'done'>('idle')
  const [bulkExportResults, setBulkExportResults] = useState<Array<{ day: string; success: boolean; path?: string }>>([])
  const [parseMode, setParseMode] = useState<'single' | 'multi'>('multi')

  useEffect(() => {
    window.api.getZwiftPath().then(setZwiftPath)
    window.api.loadKey('cf_api_key').then((k) => {
      if (k) {
        setApiKey(k)
      } else {
        const old = localStorage.getItem('cf_api_key')
        if (old) {
          setApiKey(old)
          window.api.saveKey('cf_api_key', old)
            .then(() => localStorage.removeItem('cf_api_key'))
            .catch(() => {/* keep localStorage copy if secure save failed */})
        }
      }
    })
  }, [])

  const saveApiKey = (key: string) => {
    setApiKey(key)
    window.api.saveKey('cf_api_key', key)
  }

  const togglePreDay = (day: string) => {
    setPreDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  const addDayPrefix = (w: Workout, day: string): Workout =>
    ({ ...w, name: `${day} - ${w.name}` })

  const handleParse = async () => {
    if (!image) return
    if (!apiKey) {
      setParseError('נא להזין Cloudflare credentials בהגדרות')
      return
    }
    setParseStatus('loading')
    setParseError('')
    try {
      if (parseMode === 'multi') {
        const daysArr = ALL_DAYS.filter((d) => preDays.has(d))
        const results = await parseWeeklyWorkouts(apiKey, image.base64, image.mediaType, daysArr)
        setWeeklyWorkouts(results)
        setSelectedDays(new Set(results.map((r) => r.day)))
        setParseStatus('done')
        setStep('select')
      } else {
        const result = await parseWorkoutFromImage(apiKey, image.base64, image.mediaType, dayLabel || undefined)
        setWorkout(dayLabel ? addDayPrefix(result, dayLabel) : result)
        setParseStatus('done')
        setStep('review')
      }
    } catch (err: any) {
      setParseStatus('error')
      setParseError(err.message || 'שגיאה בפירוש התמונה')
    }
  }

  const handleBulkExport = async () => {
    setBulkExportStatus('saving')
    const results: Array<{ day: string; success: boolean; path?: string }> = []
    for (const { day, workout: w } of weeklyWorkouts) {
      if (!selectedDays.has(day)) continue
      const namedWorkout = addDayPrefix(w, day)
      const zwo = workoutToZwo(namedWorkout)
      const filename = sanitizeFilename(namedWorkout.name)
      try {
        const res = await window.api.saveWorkout({ filename, content: zwo, zwiftPath })
        results.push({ day, success: res.success, path: res.path })
      } catch {
        results.push({ day, success: false })
      }
    }
    setBulkExportResults(results)
    setBulkExportStatus('done')
  }

  const handleExport = async () => {
    setExportStatus('saving')
    const zwo = workoutToZwo(workout)
    const filename = sanitizeFilename(workout.name)
    try {
      const result = await window.api.saveWorkout({ filename, content: zwo, zwiftPath })
      if (result.success) {
        setExportStatus('saved')
        setExportMessage(`נשמר: ${result.path}`)
      } else {
        setExportStatus('error')
        setExportMessage(result.message || 'שמירה בוטלה')
      }
    } catch (err: any) {
      setExportStatus('error')
      setExportMessage(err.message)
    }
  }

  const resetAll = () => {
    setStep('upload')
    setImage(null)
    setWorkout(DEFAULT_WORKOUT)
    setParseStatus('idle')
    setParseError('')
    setExportStatus('idle')
    setDayLabel('')
    setWeeklyWorkouts([])
    setSelectedDays(new Set())
    setPreDays(new Set(ALL_DAYS))
    setBulkExportStatus('idle')
    setBulkExportResults([])
  }

  const stepOrder = useMemo<Step[]>(
    () => parseMode === 'multi'
      ? ['upload', 'select', 'review', 'export']
      : ['upload', 'review', 'export'],
    [parseMode]
  )

  const stepLabels: Record<Step, string> = {
    upload: 'העלאת תמונה',
    select: 'בחירת ימים',
    review: 'עריכה',
    export: 'ייצוא'
  }

  const currentStepIdx = stepOrder.indexOf(step)
  const reviewDayIndex = ALL_DAYS.indexOf(workout.name.split(' - ')[0])

  const goBack = () => {
    if (currentStepIdx > 0) setStep(stepOrder[currentStepIdx - 1])
  }

  return (
    <div className="min-h-screen bg-zwift-darker text-white" dir="rtl">
      {/* Header */}
      <header className="bg-zwift-dark border-b border-zwift-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-bold text-sm">Z</div>
          <span className="font-bold text-lg">Convert2ZWO</span>
        </div>
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          ⚙ הגדרות API
        </button>
      </header>

      {/* API Key panel */}
      {showApiKey && (
        <div className="bg-zwift-card border-b border-zwift-border px-6 py-3 flex items-center gap-3">
          <label className="text-sm text-gray-400 whitespace-nowrap">Cloudflare (ACCOUNT_ID|API_TOKEN):</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            placeholder="abc123...|token..."
            className="flex-1 max-w-md bg-zwift-darker border border-zwift-border rounded px-3 py-1.5 text-sm text-white outline-none focus:border-orange-500"
          />
          {zwiftPath ? (
            <span className="text-xs text-green-500">✓ Zwift נמצא: {zwiftPath}</span>
          ) : (
            <span className="text-xs text-yellow-500">⚠ תיקיית Zwift לא נמצאה</span>
          )}
        </div>
      )}

      {/* Steps indicator */}
      <div className="flex justify-center gap-2 py-4 border-b border-zwift-border">
        {stepOrder.map((s, i) => {
          const isActive = step === s
          const isDone = i < currentStepIdx
          return (
            <button
              key={s}
              onClick={() => { if (isDone) setStep(s) }}
              disabled={!isDone}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm transition-colors
                ${isActive ? 'bg-orange-500 text-white' : isDone ? 'text-green-400 hover:text-green-300 cursor-pointer' : 'text-gray-600 cursor-default'}`}
            >
              {isDone && <span>✓</span>}
              {i + 1}. {stepLabels[s]}
            </button>
          )
        })}
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* ── STEP: UPLOAD ── */}
        {step === 'upload' && (
          <div className="flex flex-col gap-5">
            <h2 className="text-xl font-semibold">העלה תמונת תוכנית אימון</h2>

            <ImageUpload
              onImageSelected={(base64, mediaType, preview) =>
                setImage({ base64, mediaType, preview })
              }
            />

            {image && (
              <div className="flex flex-col gap-4 bg-zwift-card border border-zwift-border rounded-xl p-5">

                {/* Mode toggle — at bottom, below image */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setParseMode('multi')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors
                      ${parseMode === 'multi' ? 'bg-orange-500 border-orange-500 text-white' : 'border-zwift-border text-gray-400 hover:text-white'}`}
                  >
                    📅 כמה אימונים
                  </button>
                  <button
                    onClick={() => setParseMode('single')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors
                      ${parseMode === 'single' ? 'bg-orange-500 border-orange-500 text-white' : 'border-zwift-border text-gray-400 hover:text-white'}`}
                  >
                    🏋 אימון בודד
                  </button>
                </div>

                {/* Multi: day pre-selection */}
                {parseMode === 'multi' && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">בחר אילו ימים לנתח:</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DAYS.map((d) => (
                        <button
                          key={d}
                          onClick={() => togglePreDay(d)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                            ${preDays.has(d) ? 'bg-orange-500 border-orange-500 text-white' : 'border-zwift-border text-gray-500 hover:text-white'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    {preDays.size === 0 && (
                      <p className="text-xs text-yellow-500 mt-1">בחר לפחות יום אחד</p>
                    )}
                  </div>
                )}

                {/* Single: day quick-select */}
                {parseMode === 'single' && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">בחר יום (אופציונלי):</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ALL_DAYS.map((d) => (
                        <button
                          key={d}
                          onClick={() => setDayLabel(dayLabel === d ? '' : d)}
                          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors
                            ${dayLabel === d ? 'bg-orange-500 border-orange-500 text-white' : 'border-zwift-border text-gray-500 hover:text-white'}`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <input
                      value={dayLabel}
                      onChange={(e) => setDayLabel(e.target.value)}
                      placeholder="או הקלד שם אחר..."
                      className="w-full max-w-xs bg-zwift-darker border border-zwift-border rounded-lg px-3 py-2 text-white outline-none focus:border-orange-500 text-sm"
                    />
                  </div>
                )}

                {parseError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                    {parseError}
                  </div>
                )}

                <button
                  onClick={handleParse}
                  disabled={parseStatus === 'loading' || !apiKey || (parseMode === 'multi' && preDays.size === 0)}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500
                    text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {parseStatus === 'loading' ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      {'מנתח עם AI...'}
                    </>
                  ) : parseMode === 'multi' ? (
                    `נתח ${preDays.size} ימים עם AI ↓`
                  ) : (
                    'נתח אימון עם AI ↓'
                  )}
                </button>

                {!apiKey && (
                  <p className="text-xs text-yellow-500">נא להגדיר Cloudflare credentials בהגדרות</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── STEP: SELECT (multi only) ── */}
        {step === 'select' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">בחר אימונים לייצוא</h2>
              <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-300">← חזור</button>
            </div>

            <p className="text-sm text-gray-400">זוהו {weeklyWorkouts.length} אימונים. סמן את הימים לשמירה:</p>

            <div className="flex flex-col gap-3">
              {weeklyWorkouts.map(({ day, workout: w }) => {
                const checked = selectedDays.has(day)
                const dayIdx = ALL_DAYS.indexOf(day)
                return (
                  <label
                    key={day}
                    className={`flex items-center gap-3 bg-zwift-card border rounded-xl px-4 py-3 cursor-pointer transition-colors
                      ${checked ? 'border-orange-500' : 'border-zwift-border hover:border-gray-500'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = new Set(selectedDays)
                        if (checked) next.delete(day)
                        else next.add(day)
                        setSelectedDays(next)
                      }}
                      className="w-4 h-4 accent-orange-500 shrink-0"
                    />

                    {/* Cropped image of this day's column */}
                    {image && dayIdx >= 0 && (
                      <DayImageCrop src={image.preview} dayIndex={dayIdx} />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{day}</p>
                      <p className="text-sm text-gray-300 truncate">{w.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{w.segments.length} קטעים · {sanitizeFilename(`${day} - ${w.name}`)}</p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setWorkout(addDayPrefix(w, day))
                        setStep('review')
                      }}
                      className="text-xs text-orange-400 hover:text-orange-300 shrink-0"
                    >
                      עריכה
                    </button>
                  </label>
                )
              })}
            </div>

            {bulkExportStatus === 'done' && (
              <div className="flex flex-col gap-2">
                {bulkExportResults.map((r) => (
                  <div key={r.day} className={`text-sm px-3 py-2 rounded-lg ${r.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {r.success ? `✓ ${r.day}: ${r.path}` : `✕ ${r.day}: שגיאה בשמירה`}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleBulkExport}
              disabled={selectedDays.size === 0 || bulkExportStatus === 'saving'}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {bulkExportStatus === 'saving' ? 'שומר...' : bulkExportStatus === 'done' ? 'שמור שוב' : `שמור ${selectedDays.size} אימונים לZwift`}
            </button>

            {bulkExportStatus === 'done' && (
              <button onClick={resetAll} className="text-sm text-gray-500 hover:text-gray-300 underline text-center">
                המר תמונה נוספת
              </button>
            )}
          </div>
        )}

        {/* ── STEP: REVIEW ── */}
        {step === 'review' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">עריכה — {workout.name}</h2>
              <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-300">← חזור</button>
            </div>
            <WorkoutChart workout={workout} />

            {/* Image reference for this day */}
            {image && reviewDayIndex >= 0 && (
              <div className="bg-zwift-card border border-zwift-border rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-3">תמונת מקור — {workout.name.split(' - ')[0]}</p>
                <div className="flex gap-4 items-start">
                  {/* Full image (small) */}
                  <img
                    src={image.preview}
                    alt="full table"
                    className="h-36 w-auto rounded-md border border-zwift-border opacity-70 object-contain shrink-0"
                  />
                  {/* Cropped column */}
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-xs text-orange-400 font-medium">{workout.name.split(' - ')[0]}</p>
                    <DayImageCrop src={image.preview} dayIndex={reviewDayIndex} displayHeight={144} />
                  </div>
                </div>
              </div>
            )}

            <WorkoutEditor workout={workout} onChange={setWorkout} />
            <button
              onClick={() => { setStep('export'); setExportStatus('idle') }}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              המשך לייצוא ←
            </button>
          </div>
        )}

        {/* ── STEP: EXPORT ── */}
        {step === 'export' && (
          <div className="flex flex-col gap-6 max-w-lg mx-auto text-center">
            <h2 className="text-xl font-semibold">ייצוא לZwift</h2>
            <WorkoutChart workout={workout} />
            <div className="bg-zwift-card border border-zwift-border rounded-xl p-5 text-right">
              <p className="text-sm text-gray-400 mb-1">שם האימון:</p>
              <p className="font-semibold">{workout.name}</p>
              <p className="text-sm text-gray-400 mt-3 mb-1">שם הקובץ:</p>
              <p className="text-sm text-gray-300">{sanitizeFilename(workout.name)}</p>
              {zwiftPath && (
                <>
                  <p className="text-sm text-gray-400 mt-3 mb-1">יישמר ב:</p>
                  <p className="text-xs text-gray-500 break-all">{zwiftPath}</p>
                </>
              )}
            </div>
            {exportStatus === 'saved' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm">✓ {exportMessage}</div>
            )}
            {exportStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">✕ {exportMessage}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex-1 border border-zwift-border hover:border-gray-500 text-gray-400 hover:text-white py-3 rounded-xl transition-colors"
              >
                ← חזור לעריכה
              </button>
              <button
                onClick={handleExport}
                disabled={exportStatus === 'saving'}
                className="flex-grow bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                {exportStatus === 'saving' ? 'שומר...' : exportStatus === 'saved' ? 'שמור שוב' : 'שמור לZwift'}
              </button>
            </div>
            {exportStatus === 'saved' && (
              <button onClick={resetAll} className="text-sm text-gray-500 hover:text-gray-300 underline">המר אימון נוסף</button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
