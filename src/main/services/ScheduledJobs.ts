import { app } from 'electron'
import * as fs from 'fs'
import cron from 'node-cron'
import * as path from 'path'
import { logger } from '../lib/logger'
import { maintenanceService } from './MaintenanceService'

class ScheduledJobs {
  private isInitialized = false

  public init(): void {
    if (this.isInitialized) return

    // 1. Run fallback check for offline PCs (delayed by 5 minutes to not block UI startup)
    setTimeout(
      () => {
        this.checkMissedMaintenance()
      },
      5 * 60 * 1000
    )

    // 2. Schedule background maintenance to run every day at 04:00 AM
    // This runs completely in the background without blocking the Node event loop
    cron.schedule('0 4 * * *', async () => {
      logger.info('ScheduledJobs', 'Starting scheduled daily background maintenance (04:00 AM)...')
      await this.executeMaintenance()
    })

    this.isInitialized = true
    logger.info(
      'ScheduledJobs',
      'Background jobs scheduler initialized (Nightly 04:00 AM & Fallback active)'
    )
  }

  private async executeMaintenance(): Promise<void> {
    try {
      const result = await maintenanceService.archiveOldData()
      if (result.success) {
        await this.updateMarker()
        logger.info('ScheduledJobs', 'Daily background maintenance completed successfully.')
      } else {
        logger.error('ScheduledJobs', `Daily background maintenance failed: ${result.error}`)
      }
    } catch (error) {
      logger.error('ScheduledJobs', error)
    }
  }

  private async checkMissedMaintenance(): Promise<void> {
    try {
      const markerPath = this.getMarkerPath()
      if (!fs.existsSync(markerPath)) {
        logger.info(
          'ScheduledJobs',
          'No previous maintenance record found. Running initial maintenance...'
        )
        await this.executeMaintenance()
        return
      }

      const stat = await fs.promises.stat(markerPath)
      const hoursSince = (Date.now() - stat.mtime.getTime()) / (1000 * 60 * 60)

      if (hoursSince >= 24) {
        logger.info(
          'ScheduledJobs',
          `Missed maintenance detected (${Math.round(hoursSince)}h ago). Catching up...`
        )
        await this.executeMaintenance()
      } else {
        logger.debug(
          'ScheduledJobs',
          `Maintenance is up to date (ran ${Math.round(hoursSince)}h ago).`
        )
      }
    } catch (error) {
      logger.error('ScheduledJobs - Fallback Logic', error)
    }
  }

  private getMarkerPath(): string {
    const isDev = process.env.NODE_ENV === 'development'
    const baseDir = isDev ? process.cwd() : app.getPath('userData')
    const backupDir = path.join(baseDir, 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    return path.join(backupDir, '.last-archive')
  }

  private async updateMarker(): Promise<void> {
    try {
      await fs.promises.writeFile(this.getMarkerPath(), '')
    } catch (error) {
      logger.error('ScheduledJobs - Update Marker', error)
    }
  }
}

export const scheduledJobs = new ScheduledJobs()
