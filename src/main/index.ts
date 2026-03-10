import { app, shell, BrowserWindow, ipcMain, dialog, safeStorage } from 'electron'
import { join } from 'path'
import fs from 'fs'
import path from 'path'

function getKeysFilePath() {
  return path.join(app.getPath('userData'), 'api-keys.enc')
}

function loadEncryptedKeys(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(getKeysFilePath(), 'utf-8'))
  } catch {
    return {}
  }
}

const isDev = process.env['NODE_ENV'] === 'development'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'Convert2ZWO',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  setupIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ── IPC Handlers ──────────────────────────────────────────────

function setupIpcHandlers() {
  // Secure key storage (OS keychain via safeStorage)
  ipcMain.handle('keys:save', (_event, { key, value }: { key: string; value: string }) => {
    const keys = loadEncryptedKeys()
    keys[key] = safeStorage.isEncryptionAvailable()
      ? safeStorage.encryptString(value).toString('base64')
      : value
    fs.writeFileSync(getKeysFilePath(), JSON.stringify(keys))
  })

  ipcMain.handle('keys:load', (_event, key: string) => {
    const keys = loadEncryptedKeys()
    if (!keys[key]) return ''
    return safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(Buffer.from(keys[key], 'base64'))
      : keys[key]
  })

  // Detect Zwift workouts folder
  ipcMain.handle('zwift:getWorkoutsPath', () => {
    const userProfile = process.env['USERPROFILE'] || app.getPath('home')
    const workoutsBase = path.join(userProfile, 'Documents', 'Zwift', 'Workouts')

    if (!fs.existsSync(workoutsBase)) return null

    // Find Zwift ID subfolder (numeric folder name)
    try {
      const entries = fs.readdirSync(workoutsBase)
      const idFolder = entries.find((e) => /^\d+$/.test(e))
      if (idFolder) return path.join(workoutsBase, idFolder)
    } catch {
      // ignore
    }
    return workoutsBase
  })

  // Save ZWO file
  ipcMain.handle('zwift:saveWorkout', async (_event, { filename, content, zwiftPath }) => {
    let savePath = zwiftPath

    if (!savePath || !fs.existsSync(savePath)) {
      const { filePath } = await dialog.showSaveDialog({
        title: 'שמור אימון Zwift',
        defaultPath: filename,
        filters: [{ name: 'Zwift Workout', extensions: ['zwo'] }]
      })
      if (!filePath) return { success: false, message: 'בוטל' }
      savePath = filePath
    } else {
      savePath = path.join(savePath, filename)
    }

    fs.writeFileSync(savePath, content, 'utf-8')
    return { success: true, path: savePath }
  })

  // Proxy AI API requests (avoids CORS in renderer)
  ipcMain.handle('ai:fetch', async (_event, { url, headers, body }) => {
    const res = await fetch(url, { method: 'POST', headers, body })
    const text = await res.text()
    return { ok: res.ok, status: res.status, text }
  })

  // Open file dialog for image
  ipcMain.handle('dialog:openImage', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const { filePaths } = await dialog.showOpenDialog(win!, {
      title: 'בחר תמונת אימון',
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png'] }],
      properties: ['openFile']
    })
    if (!filePaths[0]) return null
    const data = fs.readFileSync(filePaths[0])
    return {
      path: filePaths[0],
      base64: data.toString('base64'),
      mediaType: filePaths[0].toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
    }
  })
}
