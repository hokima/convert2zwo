import { v4 as uuidv4 } from 'uuid'
import { jsonrepair } from 'jsonrepair'
import type { Workout, Segment } from '../types/workout'

const SYSTEM_PROMPT = `You are an expert cycling coach assistant. Your job is to parse workout descriptions from images or text and convert them into structured JSON.

RULES:
- Duration: always in SECONDS
- Power: always as a fraction of FTP (e.g., 75% FTP = 0.75, 120% FTP = 1.2)
- Cadence: RPM as integer
- "ילוכים קשים" / heavy gears / כבד = type "climb" with cadence 50-60, power ~0.85-0.95
- "מהירות" / sprint / fast = high cadence (100-120rpm) at high power (1.1-1.3)
- "קל" / easy / recovery = type "freeride" or steadystate at 0.5-0.6
- "שעת רגל קל" / easy hour = freeride or steadystate ~0.6, 60min
- If a value is uncertain, add a "warning" field to that segment explaining what you assumed
- Always include a warmup (5-10min at 0.5→0.75) and cooldown (5-10min at 0.75→0.5) if not explicitly mentioned
- For intervals described as "X דקות כפול Y פעמים עם Z דקות מנוחה": type=interval, onDuration=X*60, repeat=Y, offDuration=Z*60
- For ranges like "3-4 דקות" use the middle value (3.5min = 210s)

Return ONLY valid JSON with this exact structure:
{
  "name": "workout name",
  "description": "brief description",
  "sport": "cycling",
  "segments": [
    // warmup, cooldown: { "type": "warmup"|"cooldown", "duration": seconds, "powerLow": 0.5, "powerHigh": 0.75 }
    // steadystate/climb: { "type": "steadystate"|"climb", "duration": seconds, "power": 0.85, "cadence": 55 }
    // interval: { "type": "interval", "repeat": 5, "onDuration": 120, "onPower": 1.2, "onCadence": 95, "offDuration": 90, "offPower": 0.5, "offCadence": 80 }
    // ramp: { "type": "ramp", "duration": seconds, "powerLow": 0.5, "powerHigh": 0.75 }
    // freeride: { "type": "freeride", "duration": seconds, "cadence": 85 }
  ]
}

Each segment can optionally have: "notes": "original text", "warning": "what was assumed"`

const CF_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct'

interface MessagePart {
  inlineData?: { mimeType: string; data: string }
  text?: string
}

// apiKey format: "ACCOUNT_ID|API_TOKEN"
async function callCloudflareAI(apiKey: string, parts: MessagePart[]): Promise<string> {
  const [accountId, token] = apiKey.split('|').map((p) => p.trim())
  if (!accountId || !token) throw new Error('פורמט שגוי — נא להזין: ACCOUNT_ID|API_TOKEN')

  const content = parts.map((part) => {
    if (part.inlineData) {
      return { type: 'image_url', image_url: { url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` } }
    }
    return { type: 'text', text: part.text }
  })

  const { ok, status, text } = await window.api.fetchAI({
    url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_MODEL}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content }] })
  })
  const data = JSON.parse(text)
  if (!ok || !data.success) {
    const msg = data?.errors?.[0]?.message || JSON.stringify(data?.errors) || status
    throw new Error(`[${status}] ${msg}`)
  }
  return data.result?.response ?? ''
}

function extractJson(text: string): string {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/)
  if (!jsonMatch) throw new Error('AI did not return valid JSON')
  return jsonrepair(jsonMatch[1])
}

function buildWorkout(parsed: any): Workout {
  return {
    name: parsed.name || 'אימון חדש',
    description: parsed.description || '',
    sport: parsed.sport || 'cycling',
    segments: (parsed.segments || []).map((s: Omit<Segment, 'id'>) => ({ ...s, id: uuidv4() }))
  }
}

export async function parseWorkoutFromImage(
  apiKey: string,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png',
  dayLabel?: string
): Promise<Workout> {
  const userText = dayLabel
    ? `Parse the workout for day: "${dayLabel}". Return the JSON structure only.`
    : 'Parse all workouts visible in this image. Return the JSON for the most prominent workout, or the full week if it makes sense.'

  const text = await callCloudflareAI(apiKey, [
    { inlineData: { mimeType: mediaType, data: imageBase64 } },
    { text: userText }
  ])
  return buildWorkout(JSON.parse(extractJson(text)))
}

export async function parseWorkoutFromText(apiKey: string, workoutText: string): Promise<Workout> {
  const text = await callCloudflareAI(apiKey, [
    { text: `Parse this workout description:\n\n${workoutText}\n\nReturn the JSON structure only.` }
  ])
  return buildWorkout(JSON.parse(extractJson(text)))
}

// Parse each day in parallel for speed
export async function parseWeeklyWorkouts(
  apiKey: string,
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png',
  daysToParse: string[]
): Promise<Array<{ day: string; workout: Workout }>> {
  const results = await Promise.all(
    daysToParse.map(async (day) => {
      const text = await callCloudflareAI(apiKey, [
        { inlineData: { mimeType: mediaType, data: imageBase64 } },
        { text: `Parse ONLY the workout for day "${day}" from this weekly training table. Return the JSON structure only.` }
      ])
      return { day, workout: buildWorkout(JSON.parse(extractJson(text))) }
    })
  )
  return results
}
