import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

class Logger {
  private logPath: string

  constructor() {
    const isDev = process.env.NODE_ENV === 'development'
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    const logsDir = path.join(baseDir, 'logs')

    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    this.logPath = path.join(logsDir, 'technical.log')
  }

  error(context: string, error: unknown): void {
    const timestamp = new Date().toISOString()
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error)
    const logEntry = `[${timestamp}] [ERROR] [${context}]: ${errorMessage}\n`

    console.error(logEntry)

    try {
      fs.appendFileSync(this.logPath, logEntry)
      this.rotateLogIfLarge()
    } catch (err) {
      console.error('Failed to write to log file:', err)
    }
  }

  info(context: string, message: string): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [INFO] [${context}]: ${message}\n`

    try {
      fs.appendFileSync(this.logPath, logEntry)
    } catch (err) {
      console.error('Failed to write to log file:', err)
    }
  }

  private rotateLogIfLarge(): void {
    try {
      const stats = fs.statSync(this.logPath)
      const maxSize = 5 * 1024 * 1024 // 5MB

      if (stats.size > maxSize) {
        const backupPath = `${this.logPath}.old`
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath)
        }
        fs.renameSync(this.logPath, backupPath)
      }
    } catch {
      // Rotation failed, ignore
    }
  }
}

export const logger = new Logger()
