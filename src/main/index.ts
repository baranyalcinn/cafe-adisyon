import { app, shell, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { registerAllHandlers } from './ipc'
import { logger, electronLog } from './lib/logger'
import { dbMaintenance } from './lib/db-maintenance'
import { basePrisma } from './db/prisma'

// Configure Auto Updater
autoUpdater.logger = electronLog
autoUpdater.autoDownload = true

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
      sandbox: false
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
          "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: resource: blob: file:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.caffio.app;"
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

// Auto Updater Events - Defined globally to prevent duplicate listeners
autoUpdater.on('checking-for-update', () => {
  logger.info('AutoUpdater', 'Checking for update...')
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('checking-for-update')
  })
})

autoUpdater.on('update-available', () => {
  logger.info('AutoUpdater', 'Update available')
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update-available')
  })
})

autoUpdater.on('update-not-available', () => {
  logger.info('AutoUpdater', 'Update not available')
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update-not-available')
  })
})

autoUpdater.on('update-downloaded', () => {
  logger.info('AutoUpdater', 'Update downloaded')
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update-downloaded')
  })
})

autoUpdater.on('error', (err) => {
  logger.error('AutoUpdater', err)
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('update-error', err.message || 'Unknown update error')
  })
})

// Global IPC for restarting after update
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall(true, true)
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
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(async () => {
    // Set app user model id for windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.caffio.caffio')
    }

    // Run DB Maintenance on startup
    await dbMaintenance.runMaintenance()

    // Register IPC handlers for database operations
    registerAllHandlers()

    createWindow()

    // Check for updates
    if (app.isPackaged) {
      autoUpdater.checkForUpdatesAndNotify()
    }

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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Graceful shutdown — flush pending operations before exit
app.on('before-quit', async (event) => {
  // We need to prevent immediate quit to allow DB disconnect,
  // but if we preventDefault, we must call app.exit() ourself.
  // However, autoUpdater.quitAndInstall() might trigger this too.

  if (!basePrisma) return

  event.preventDefault()
  try {
    await basePrisma.$disconnect()
    logger.info('App', 'Graceful shutdown completed')
  } catch (error) {
    logger.error('Shutdown error', error)
  }
  app.exit(0)
})

// Global Exception Handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason)
})
