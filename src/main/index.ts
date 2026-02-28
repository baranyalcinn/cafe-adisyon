import { app, BrowserWindow, ipcMain, powerMonitor, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/types'
import { disconnectDb, prisma } from './db/prisma'
import { registerAllHandlers } from './ipc'
import { dbMaintenance } from './lib/db-maintenance'
import { electronLog, logger } from './lib/logger'
import { orderService } from './services/OrderService'
import { reportingService } from './services/ReportingService'

// ============================================================================
// Global Configuration & State
// ============================================================================

const APP_CONFIG = {
  DEV: process.env.NODE_ENV === 'development',
  PACKAGED: app.isPackaged,
  WINDOW: {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    bg: '#000000'
  },
  UPDATER: {
    maxRetries: 3,
    retryDelayMs: 30_000, // 30 seconds
    pollIntervalMs: 24 * 60 * 60 * 1000, // 24 hours
    initialDelayMs: 3_000 // 3 seconds after boot
  }
} as const

const appState = {
  isQuitting: false,
  updateCheckRetries: 0
}

// ============================================================================
// Chromium & App Optimizations
// ============================================================================

function applyChromiumOptimizations(): void {
  // Memory & Rendering optimizations for POS
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=350')
  app.commandLine.appendSwitch('disable-software-rasterizer')
  app.commandLine.appendSwitch('force-color-profile', 'srgb')
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('ignore-gpu-blocklist')

  if (APP_CONFIG.DEV) {
    // Disable cache in dev to prevent blockfile corruption during HMR
    app.commandLine.appendSwitch('disable-http-cache')
  }
}

// ============================================================================
// Window Management
// ============================================================================

function sendToAllWindows(channel: string, ...args: unknown[]): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(channel, ...args)
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: APP_CONFIG.WINDOW.width,
    height: APP_CONFIG.WINDOW.height,
    minWidth: APP_CONFIG.WINDOW.minWidth,
    minHeight: APP_CONFIG.WINDOW.minHeight,
    title: 'Caffio',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    backgroundColor: APP_CONFIG.WINDOW.bg,
    icon: APP_CONFIG.DEV
      ? join(__dirname, '../../resources/icon.png')
      : join(process.resourcesPath, 'resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true
    }
  })

  // IPC Handlers: Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => mainWindow.minimize())
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () =>
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
  )
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => mainWindow.close())

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Content Security Policy (CSP) - Cleanly formatted
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp = [
      "default-src 'self' 'unsafe-inline' data:;",
      "script-src 'self' 'unsafe-inline';",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
      "img-src 'self' data: resource: blob: file:;",
      "font-src 'self' data: https://fonts.gstatic.com;",
      "connect-src 'self' https://api.caffio.app https://github.com https://*.github.com;"
    ].join(' ')

    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] } })
  })

  // Load App URL/File
  if (APP_CONFIG.DEV && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (!APP_CONFIG.DEV) {
    mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools())
  }
}

// ============================================================================
// Auto Updater Service
// ============================================================================

function setupAutoUpdater(): void {
  if (APP_CONFIG.DEV || !APP_CONFIG.PACKAGED) return

  autoUpdater.logger = electronLog
  autoUpdater.autoDownload = true
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false
  autoUpdater.autoInstallOnAppQuit = true

  // Safety Check IPC
  ipcMain.handle('can-update-safely', async () => {
    try {
      const openOrders = await prisma.order.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      })
      return openOrders === 0
    } catch (error) {
      logger.error('Safety Check', error)
      return false
    }
  })

  // Updater Events
  autoUpdater.on('checking-for-update', () => {
    logger.info('AutoUpdater', 'Checking for update...')
    sendToAllWindows('checking-for-update')
  })

  autoUpdater.on('update-available', (info) => {
    appState.updateCheckRetries = 0
    logger.info('AutoUpdater', `Update available: ${info.version}`)
    sendToAllWindows('update-available', { version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    appState.updateCheckRetries = 0
    sendToAllWindows('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToAllWindows('download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    logger.info('AutoUpdater', `Update downloaded: ${info.version}`)
    let safeToUpdate = false
    try {
      const openOrders = await prisma.order.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } }
      })
      safeToUpdate = openOrders === 0
    } catch (e) {
      logger.error('AutoUpdater', e)
    }

    sendToAllWindows('update-downloaded', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
      currentVersion: app.getVersion(),
      safeToUpdate
    })
  })

  autoUpdater.on('error', (err) => {
    logger.error('AutoUpdater', err)
    // Network Error Retry Mechanism
    if (
      err.message?.includes('net::') &&
      appState.updateCheckRetries < APP_CONFIG.UPDATER.maxRetries
    ) {
      appState.updateCheckRetries++
      logger.info(
        'AutoUpdater',
        `Retrying... (${appState.updateCheckRetries}/${APP_CONFIG.UPDATER.maxRetries})`
      )
      setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), APP_CONFIG.UPDATER.retryDelayMs)
    } else {
      appState.updateCheckRetries = 0
      sendToAllWindows('update-error', {
        message: err.message || 'Bilinmeyen güncelleme hatası',
        canRetry: true
      })
    }
  })

  // Global IPCs
  ipcMain.on(IPC_CHANNELS.SYSTEM_RESTART, () => {
    appState.isQuitting = true
    autoUpdater.quitAndInstall(true, true)
  })

  ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_UPDATE, async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        success: true,
        data: {
          available: result !== null,
          version: result?.updateInfo.version,
          currentVersion: app.getVersion()
        }
      }
    } catch (error) {
      logger.error('Manual update check failed', error)
      return { success: false, error: (error as Error).message }
    }
  })
}

// ============================================================================
// System Monitors (Power & OS)
// ============================================================================

function setupSystemMonitors(): void {
  powerMonitor.on('suspend', () => logger.info('System', 'System stopped (suspend)'))
  powerMonitor.on('resume', () => logger.info('System', 'System resumed'))
  powerMonitor.on('lock-screen', () => logger.info('System', 'Screen locked'))
  powerMonitor.on('unlock-screen', () => logger.info('System', 'Screen unlocked'))

  app.on('activate', () => {
    // macOS re-create window on dock click
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Hardware Info
  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_VERSION, () => app.getVersion())
}

// ============================================================================
// App Boot Sequence
// ============================================================================

async function initializeDatabaseTasks(): Promise<void> {
  await dbMaintenance.runMaintenance()
  try {
    await reportingService.mergeDuplicateMonthlyReports()
  } catch (e) {
    logger.error('App', 'Failed to merge duplicate monthly reports: ' + (e as Error).message)
  }
}

async function bootstrapApp(): Promise<void> {
  if (process.platform === 'win32') app.setAppUserModelId('com.caffio.caffio')

  // 1. Prepare Data Layer
  await initializeDatabaseTasks()
  registerAllHandlers()

  // 2. Setup Event Listeners
  setupSystemMonitors()
  setupAutoUpdater()
  orderService.on('order:updated', () => sendToAllWindows('dashboard:update'))

  // 3. Render UI
  createWindow()
  logger.info('App', `Starting Caffio v${app.getVersion()}`)

  // 4. Start Background Processes
  import('./services/ScheduledJobs')
    .then(({ scheduledJobs }) => scheduledJobs.init())
    .catch((err) => logger.error('App', 'Failed to initialize ScheduledJobs: ' + err.message))

  // 5. Trigger Initial Update Check
  setTimeout(() => {
    if (!APP_CONFIG.DEV && APP_CONFIG.PACKAGED) {
      autoUpdater.checkForUpdatesAndNotify()
      setInterval(() => autoUpdater.checkForUpdatesAndNotify(), APP_CONFIG.UPDATER.pollIntervalMs)
    }
  }, APP_CONFIG.UPDATER.initialDelayMs)
}

// ============================================================================
// App Lifecycle
// ============================================================================

// Verify Single Instance
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  applyChromiumOptimizations()
  app.whenReady().then(bootstrapApp)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', async (event) => {
  if (appState.isQuitting || !prisma) return

  event.preventDefault()
  appState.isQuitting = true

  try {
    await disconnectDb()
    logger.info('App', 'Graceful shutdown completed')
  } catch (error) {
    logger.error('Shutdown error', error)
  } finally {
    app.exit(0)
  }
})

process.on('uncaughtException', (error) => logger.error('Uncaught Exception', error))
process.on('unhandledRejection', (reason) => logger.error('Unhandled Rejection', reason))
