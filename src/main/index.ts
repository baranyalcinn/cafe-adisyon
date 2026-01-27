import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerAllHandlers } from './ipc'
import { logger } from './lib/logger'
import { dbMaintenance } from './lib/db-maintenance'

function createWindow(): void {
  // Create the browser window - optimized for POS application
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Caffio',
    show: false,
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

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Global Exception Handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error)
  // In a real production app, you might want to show a dialog to the user here
})
