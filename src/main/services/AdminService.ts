import { prisma } from '../db/prisma'
import { logger } from '../lib/logger'

export class AdminService {
  async verifyPin(pin: string) {
    try {
      let settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      // Create default settings if not exists (Default: No PIN)
      if (!settings) {
        settings = await prisma.appSettings.create({
          data: { id: 'app-settings', adminPin: '' }
        })
      }

      // Check if PIN is set
      const isPinRequired = settings.adminPin !== ''

      // Auto-verify if no PIN is required and user sent empty pin
      if (!isPinRequired && (pin === '' || !pin)) {
        return { success: true, data: { valid: true, required: false } }
      }

      // Rescue Code: If 9999 is entered, clear PIN
      if (pin === '9999') {
        await prisma.appSettings.update({
          where: { id: 'app-settings' },
          data: { adminPin: '' }
        })
        logger.error('Admin Reset', 'PIN cleared via rescue code 9999')
        return { success: true, data: { valid: true, required: false, reset: true } }
      }

      const isValid = settings.adminPin === pin
      if (!isValid && isPinRequired) {
        logger.error('Admin Verify Mismatch', `Failed PIN attempt. Entered: ${pin}`)
      }

      return { success: true, data: { valid: isValid, required: isPinRequired } }
    } catch (error) {
      logger.error('AdminService.verifyPin', error)
      return { success: false, error: 'PIN doğrulanamadı.' }
    }
  }

  async checkStatus() {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })
      return { success: true, data: { required: settings ? settings.adminPin !== '' : false } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async changePin(currentPin: string, newPin: string) {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      if (!settings || settings.adminPin !== currentPin) {
        return { success: false, error: 'Mevcut PIN yanlış.' }
      }

      await prisma.appSettings.update({
        where: { id: 'app-settings' },
        data: { adminPin: newPin }
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('AdminService.changePin', error)
      return { success: false, error: 'PIN değiştirilemedi.' }
    }
  }

  async setRecovery(currentPin: string, question: string, answer: string) {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      if (!settings || settings.adminPin !== currentPin) {
        return { success: false, error: 'Mevcut PIN yanlış.' }
      }

      await prisma.appSettings.update({
        where: { id: 'app-settings' },
        data: {
          securityQuestion: question,
          securityAnswer: answer.toLowerCase().trim()
        }
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('AdminService.setRecovery', error)
      return { success: false, error: 'Güvenlik sorusu ayarlanamadı.' }
    }
  }

  async getRecoveryQuestion() {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      if (!settings?.securityQuestion) {
        return { success: true, data: null }
      }

      return { success: true, data: settings.securityQuestion }
    } catch (error) {
      logger.error('AdminService.getRecoveryQuestion', error)
      return { success: false, error: 'Güvenlik sorusu alınamadı.' }
    }
  }

  async resetPin(answer: string) {
    try {
      const settings = await prisma.appSettings.findUnique({
        where: { id: 'app-settings' }
      })

      if (!settings?.securityAnswer) {
        return { success: false, error: 'Güvenlik sorusu ayarlanmamış.' }
      }

      if (settings.securityAnswer !== answer.toLowerCase().trim()) {
        return { success: false, error: 'Yanlış cevap.' }
      }

      // Reset PIN to default '1234'
      await prisma.appSettings.update({
        where: { id: 'app-settings' },
        data: { adminPin: '1234' }
      })

      return { success: true, data: null }
    } catch (error) {
      logger.error('AdminService.resetPin', error)
      return { success: false, error: 'PIN sıfırlanamadı.' }
    }
  }
}

export const adminService = new AdminService()
