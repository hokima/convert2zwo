# Convert2ZWO

**Convert2ZWO** is a free desktop app (Windows) that converts cycling workout plans — from images or text — into Zwift `.zwo` workout files, using AI.

Upload a screenshot of your weekly training table, select the days you want, and export them directly to your Zwift workouts folder.

---

## Features

- **Image parsing** — upload a photo or screenshot of a training plan; the AI reads it and builds a structured workout
- **Weekly table mode** — parse all 6 days of a weekly table in parallel; review and select which days to export
- **Workout editor** — review and edit every segment before exporting (power, cadence, duration, type)
- **Visual graph** — see the power curve of the parsed workout
- **Direct export to Zwift** — saves `.zwo` files straight to your Zwift workouts folder
- **Free AI** — powered by Cloudflare Workers AI (10,000 free requests/day, no credit card required)

---

## Getting Started

### 1. Install

```bash
git clone https://github.com/YOUR_USERNAME/convert2zwo.git
cd convert2zwo
npm install
npm run start
```

### 2. Get a free Cloudflare API key

The app uses **Cloudflare Workers AI** — it's free for up to 10,000 AI requests per day.

**Step-by-step:**

1. Go to [cloudflare.com](https://cloudflare.com) and create a free account (no credit card needed)
2. After logging in, open the **Cloudflare Dashboard**
3. Your **Account ID** is shown in the right sidebar on any dashboard page
4. Go to **My Profile → API Tokens → Create Token**
5. Use the **"Workers AI (Beta)"** template → click **Continue to summary** → **Create Token**
6. Copy the token — you will only see it once

Your API key for this app is:
```
ACCOUNT_ID|API_TOKEN
```
Example:
```
abc123def456|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Enter the key in the app

- Click the **⚙ Settings** button (top right)
- Paste your `ACCOUNT_ID|API_TOKEN` into the field
- Click **Save** — the key is stored encrypted on your machine using OS-level encryption (Electron safeStorage)

---

## Usage

### Single workout
1. Click **Upload** and select a workout image (JPG/PNG)
2. Make sure the mode toggle at the bottom shows **"יום בודד"** (single day)
3. Click **"נתח אימון עם AI"**
4. Review / edit the segments
5. Click **"ייצוא ל-Zwift"**

### Full week (table image)
1. Upload an image of your weekly training table
2. Select which days to parse (or keep all 6 selected)
3. Click **"נתח X ימים עם AI"** — all days are parsed in parallel
4. In the results screen, check which workouts to export; click **"עריכה"** to review any individual day
5. Click **"שמור X אימונים ל-Zwift"** — all files are saved at once

---

## Zwift Workouts Folder

The app auto-detects your Zwift workouts path:
```
C:\Users\<YOU>\Documents\Zwift\Workouts\<ZwiftID>\
```
If it can't find it, you can still export and it will prompt you to choose a location.

---

## Building a Windows Installer

```bash
npm run build:win
```
The `.exe` installer will be in `release/`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 29 |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| AI | Cloudflare Workers AI (`llama-4-scout-17b`) |
| Charts | Recharts |
| Build | electron-vite |

---

## Privacy

- Your API key is stored **only on your machine** using OS-level encryption (`safeStorage`)
- Images are sent directly from your computer to Cloudflare's API — nothing goes through any third-party server
- No telemetry, no accounts, no subscriptions

---

## License

MIT
