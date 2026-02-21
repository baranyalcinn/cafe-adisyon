import { app } from 'electron'
import log from 'electron-log'
import * as path from 'path'

// Configure electron-log
log.transports.file.level = 'info'
log.transports.console.format = '{h}:{i}:{s} {text}'

// Set log file path to user data directory
const isDev = process.env.NODE_ENV === 'development'
if (isDev) {
  log.transports.file.resolvePathFn = () => path.join(process.cwd(), 'logs/technical.log')
} else {
  log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/technical.log')
}

class Logger {
  private isDev = process.env.NODE_ENV === 'development'

  error(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error)
    log.error(`[${context}] ${errorMessage}`)
  }

  info(context: string, message: string): void {
    log.info(`[${context}] ${message}`)
  }

  /** Only logs in development mode — use for verbose operational details */
  debug(context: string, message: string): void {
    if (this.isDev) {
      log.debug(`[${context}] ${message}`)
    }
  }
}

export const logger = new Logger()
export const electronLog = log
