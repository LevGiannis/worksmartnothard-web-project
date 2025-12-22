import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs/promises'

type StorageFile = Record<string, string>

const STORAGE_FILE_NAME = 'worksmart-device-storage.json'
const LOG_FILE_NAME = 'worksmartnothard.log'

function nowIso(): string {
  return new Date().toISOString()
}

function formatUnknownError(err: unknown): string {
  if (err instanceof Error) {
    return `${err.name}: ${err.message}\n${err.stack ?? ''}`.trim()
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

async function appendLogLine(message: string, details?: unknown): Promise<void> {
  try {
    const logPath = path.join(app.getPath('userData'), LOG_FILE_NAME)
    await fs.mkdir(path.dirname(logPath), { recursive: true })
    const line = details
      ? `[${nowIso()}] ${message} | ${formatUnknownError(details)}\n`
      : `[${nowIso()}] ${message}\n`
    await fs.appendFile(logPath, line, 'utf-8')
  } catch {
    // best-effort logging only
  }
}

// Citrix / VDI environments frequently crash Chromium GPU process.
// Default to disabling GPU acceleration; allow opt-in via env.
if (process.env.WS_ENABLE_GPU !== 'true') {
  try {
    app.disableHardwareAcceleration()
    app.commandLine.appendSwitch('disable-gpu')
    app.commandLine.appendSwitch('disable-gpu-compositing')
  } catch {
    // ignore
  }
}

async function readStorageFile(): Promise<StorageFile> {
  const filePath = path.join(app.getPath('userData'), STORAGE_FILE_NAME)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object') return parsed as StorageFile
    return {}
  } catch {
    return {}
  }
}

async function writeStorageFile(next: StorageFile): Promise<void> {
  const filePath = path.join(app.getPath('userData'), STORAGE_FILE_NAME)
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, JSON.stringify(next), 'utf-8')
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.webContents.on('render-process-gone', (_event, details) => {
    void appendLogLine('render-process-gone', details)
  })
  win.webContents.on('unresponsive', () => {
    void appendLogLine('webContents unresponsive')
  })
  win.webContents.on('responsive', () => {
    void appendLogLine('webContents responsive')
  })
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    void appendLogLine('did-fail-load', { errorCode, errorDescription, validatedURL })
  })

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    await win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    await win.loadFile(path.join(app.getAppPath(), 'dist', 'index.html'))
  }
}

function registerIpcStorageHandlers() {
  ipcMain.handle('ws-storage:getItem', async (_event, key: string) => {
    const data = await readStorageFile()
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
  })

  ipcMain.handle('ws-storage:setItem', async (_event, key: string, value: string) => {
    const data = await readStorageFile()
    data[key] = value
    await writeStorageFile(data)
    return true
  })

  ipcMain.handle('ws-storage:removeItem', async (_event, key: string) => {
    const data = await readStorageFile()
    delete data[key]
    await writeStorageFile(data)
    return true
  })

  ipcMain.handle('ws-storage:clear', async () => {
    await writeStorageFile({})
    return true
  })
}

app.whenReady().then(() => {
  void appendLogLine('app starting', {
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    userData: app.getPath('userData'),
    argv: process.argv,
  })

  process.on('uncaughtException', (err) => {
    void appendLogLine('uncaughtException', err)
  })
  process.on('unhandledRejection', (reason) => {
    void appendLogLine('unhandledRejection', reason)
  })

  registerIpcStorageHandlers()
  return createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})
