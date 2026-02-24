import { app, BrowserWindow, ipcMain, powerMonitor, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join } from 'path'
import { IPC_CHANNELS } from '../shared/types'
import { disconnectDb, prisma } from './db/prisma'
import { registerAllHandlers } from './ipc'
import { dbMaintenance } from './lib/db-maintenance'
import { electronLog, logger } from './lib/logger'
import { orderService } from './services/OrderService'

// Chromium memory optimizations for POS
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=350')
app.commandLine.appendSwitch('disable-software-rasterizer')
app.commandLine.appendSwitch('force-color-profile', 'srgb')

// Configuration constants
const isDev = process.env.NODE_ENV === 'development'
const isPackaged = app.isPackaged

if (isDev) {
  // Disable Chromium HTTP disk cache in development to prevent blockfile corruption (-8)
  // that frequently occurs during rapid HMR application reloads.
  app.commandLine.appendSwitch('disable-http-cache')
}

// Quit flag for graceful shutdown
let isQuitting = false
let updateCheckRetries = 0
const MAX_RETRIES = 3

function createWindow(): void {
  // Create the browser window - optimized for POS application
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Caffio',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon:
      process.env.NODE_ENV === 'development'
        ? join(__dirname, '../../resources/icon.png')
        : join(process.resourcesPath, 'resources/icon.png'),
    backgroundColor: '#000000', // Optimize startup paint
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: true
    }
  })

  // Window control IPC handlers
  ipcMain.on('window:minimize', () => mainWindow.minimize())
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })
  ipcMain.on('window:close', () => mainWindow.close())

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    // Start maximized for POS usage
    mainWindow.maximize()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Content Security Policy (CSP)
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: resource: blob: file:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.caffio.app https://github.com https://*.github.com;"
        ]
      }
    })
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Prevent DevTools from opening in production
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }
}

// --- Auto Updater Global Configuration ---

// Configure Auto Updater (Production Only)
if (!isDev && isPackaged) {
  autoUpdater.logger = electronLog
  autoUpdater.autoDownload = true
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false
  autoUpdater.autoInstallOnAppQuit = true
}

// Send events to all windows
function sendToAllWindows(channel: string, ...args: unknown[]): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send(channel, ...args)
  })
}

// Safety Check IPC
ipcMain.handle('can-update-safely', async () => {
  try {
    // Check for open orders (OPEN, PREPARING, SERVED, etc.)
    // We assume 'COMPLETED' and 'CANCELLED' are the only safe statuses.
    const openOrders = await prisma.order.count({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        }
      }
    })
    return openOrders === 0
  } catch (error) {
    logger.error('Safety Check', error)
    return false // Fail safe
  }
})

// Auto Updater Events
autoUpdater.on('checking-for-update', () => {
  logger.info('AutoUpdater', 'Checking for update...')
  sendToAllWindows('checking-for-update')
})

autoUpdater.on('update-available', (info) => {
  updateCheckRetries = 0
  logger.info('AutoUpdater', `Update available: ${info.version}`)
  sendToAllWindows('update-available', { version: info.version })
})

autoUpdater.on('update-not-available', () => {
  updateCheckRetries = 0
  logger.info('AutoUpdater', 'Update not available')
  sendToAllWindows('update-not-available')
})

autoUpdater.on('download-progress', (progress) => {
  // logger.info('AutoUpdater', `Downloaded ${Math.round(progress.percent)}%`) // Optional: Log progress
  sendToAllWindows('download-progress', {
    percent: Math.round(progress.percent),
    transferred: progress.transferred,
    total: progress.total
  })
})

autoUpdater.on('update-downloaded', async (info) => {
  logger.info('AutoUpdater', `Update downloaded: ${info.version}`)

  // Check if safe to update
  let safeToUpdate = false
  try {
    const openOrders = await prisma.order.count({
      where: {
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        }
      }
    })
    safeToUpdate = openOrders === 0
  } catch (e) {
    logger.error('AutoUpdater', e)
  }

  // Notify Renderer
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
  if (err.message?.includes('net::') && updateCheckRetries < MAX_RETRIES) {
    updateCheckRetries++
    logger.info('AutoUpdater', `Retrying... (${updateCheckRetries}/${MAX_RETRIES})`)

    setTimeout(() => {
      if (!isDev && isPackaged) {
        autoUpdater.checkForUpdatesAndNotify()
      }
    }, 30000) // Retry after 30 seconds
  } else {
    updateCheckRetries = 0
    sendToAllWindows('update-error', {
      message: err.message || 'Bilinmeyen güncelleme hatası',
      canRetry: true
    })
  }
})

// Global IPC for restarting after update
ipcMain.on(IPC_CHANNELS.SYSTEM_RESTART, () => {
  isQuitting = true // Bypass graceful shutdown check
  autoUpdater.quitAndInstall(true, true)
})

// Manual Check IPC
ipcMain.handle(IPC_CHANNELS.SYSTEM_CHECK_UPDATE, async () => {
  if (!isDev && !isPackaged) {
    return { success: true, data: { available: false, message: 'Dev modunda güncelleme yok' } }
  }

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

// Get System Version IPC
ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_VERSION, () => {
  return app.getVersion()
})

// Force GPU acceleration features for maximum performance
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.whenReady().then(async () => {
    // Set app user model id for windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.caffio.caffio')
    }

    // Run DB Maintenance on startup
    await dbMaintenance.runMaintenance()

    // Merge any duplicate monthly reports caused by legacy timezone issues
    try {
      const { ReportingService } = await import('./services/ReportingService')
      const service = new ReportingService()
      await service.mergeDuplicateMonthlyReports()
    } catch (e) {
      logger.error('App', 'Failed to merge duplicate monthly reports: ' + (e as Error).message)
    }

    // Register IPC handlers for database operations
    registerAllHandlers()

    // Listen for backend service events
    orderService.on('order:updated', () => {
      sendToAllWindows('dashboard:update')
    })

    createWindow()

    logger.info('App', `Starting Caffio v${app.getVersion()}`)

    // Initialize scheduled background jobs (e.g. 04:00 AM daily maintenance)
    import('./services/ScheduledJobs')
      .then(({ scheduledJobs }) => {
        scheduledJobs.init()
      })
      .catch((err) => {
        logger.error('App', 'Failed to initialize ScheduledJobs: ' + err.message)
      })

    // Check for updates (Production Only)
    // We wait a bit to let the window load
    setTimeout(() => {
      if (!isDev && isPackaged) {
        autoUpdater.checkForUpdatesAndNotify()
        // Check daily
        setInterval(
          () => {
            autoUpdater.checkForUpdatesAndNotify()
          },
          24 * 60 * 60 * 1000
        )
      }
    }, 3000)

    // Power Monitor
    powerMonitor.on('suspend', () => {
      logger.info('System', 'System stopped (suspend)')
    })

    powerMonitor.on('resume', () => {
      logger.info('System', 'System resumed')
      // Optional: Refresh data or check connectivity here
    })

    powerMonitor.on('lock-screen', () => {
      logger.info('System', 'Screen locked')
    })

    powerMonitor.on('unlock-screen', () => {
      logger.info('System', 'Screen unlocked')
    })

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Graceful shutdown — flush pending operations before exit
app.on('before-quit', async (event) => {
  // If explicitly quitting (e.g. for update), skip this check
  if (isQuitting || !prisma) return

  // Prevent immediate quit to allow DB disconnect
  event.preventDefault()
  isQuitting = true // Prevent infinite loop if we call app.quit() again

  try {
    await disconnectDb()
    logger.info('App', 'Graceful shutdown completed')
  } catch (error) {
    logger.error('Shutdown error', error)
  } finally {
    app.exit(0)
  }
})

// Global Exception Handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason)
})
