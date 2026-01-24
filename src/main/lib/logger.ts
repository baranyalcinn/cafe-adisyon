import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

export class Logger {
  private logPath: string
  private maxSizeBytes: number

  constructor(filename: string = 'backend-errors.log', maxSizeBytes: number = 5 * 1024 * 1024) {
    const isDev = process.env.NODE_ENV === 'development'
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    this.logPath = path.join(baseDir, filename)
    this.maxSizeBytes = maxSizeBytes

    // Ensure log file exists or create it
    this.rotateIfNeeded()
  }

  private rotateIfNeeded(): void {
    try {
      if (fs.existsSync(this.logPath)) {
        const stats = fs.statSync(this.logPath)
        if (stats.size > this.maxSizeBytes) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const backupPath = `${this.logPath}.${timestamp}.old`
          fs.renameSync(this.logPath, backupPath)

          // Cleanup very old logs (keep last 5)
          this.cleanupOldLogs()
        }
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error)
    }
  }

  private cleanupOldLogs(): void {
    try {
      const dir = path.dirname(this.logPath)
      const basename = path.basename(this.logPath)

      const files = fs
        .readdirSync(dir)
        .filter((f) => f.startsWith(basename) && f.endsWith('.old'))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(dir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time) // Newest first

      // Delete if more than 5
      if (files.length > 5) {
        files.slice(5).forEach((file) => {
          fs.unlinkSync(path.join(dir, file.name))
        })
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error)
    }
  }

  public error(context: string, error: unknown): void {
    try {
      const timestamp = new Date().toISOString()
      const message = `${timestamp} [${context}] ERROR: ${String(error)}\n`
      fs.appendFileSync(this.logPath, message)
    } catch (err) {
      console.error('Failed to write to log:', err)
    }
  }

  public info(context: string, message: string): void {
    try {
      const timestamp = new Date().toISOString()
      const logMessage = `${timestamp} [${context}] INFO: ${message}\n`
      fs.appendFileSync(this.logPath, logMessage)
    } catch (err) {
      console.error('Failed to write to log:', err)
    }
  }
}

export const logger = new Logger()
