import { PrismaClient } from 'prisma-client-generated'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// Veritabanı dosyasının adı
const DB_FILENAME = 'dev.db'

// 1. Veritabanı Yolu Belirleme (DB Path Strategy)
// Geliştirme ortamında proje kökünü, üretimde (prod) kullanıcının veri klasörünü kullanır.
// Üretimde "resources" klasörüne yazamayız, o yüzden "userData"ya kopyalayacağız.
const dbPath = app.isPackaged
  ? path.join(app.getPath('userData'), DB_FILENAME)
  : path.join(__dirname, '../../../prisma', DB_FILENAME) // Proje yapınıza göre '../' sayısını ayarlayın

// 2. Prisma Engine ve Schema Yolları
// Üretimde (Production) bu dosyalar resources klasöründe olacak.
const qePath = app.isPackaged
  ? path.join(process.resourcesPath, 'prisma/client') // electron-builder.yml'da verdiğimiz yol
  : undefined // Dev ortamında node_modules'dan otomatik bulur

const schemaPath = app.isPackaged
  ? path.join(process.resourcesPath, 'prisma/schema.prisma')
  : undefined

// 3. Üretim Ortamı İçin Veritabanı Hazırlığı
if (app.isPackaged) {
  // Eğer userData klasöründe veritabanı yoksa, resources'tan kopyala (ilk kurulum)
  if (!fs.existsSync(dbPath)) {
    // electron-builder ile kopyaladığımız "temiz" veritabanı
    const originalDbPath = path.join(process.resourcesPath, 'prisma', DB_FILENAME)

    // Eğer kaynak veritabanı varsa kopyala, yoksa boş oluşturulmasını bekle
    if (fs.existsSync(originalDbPath)) {
      try {
        fs.copyFileSync(originalDbPath, dbPath)
        console.log('Veritabanı başarıyla kopyalandı:', dbPath)
      } catch (e) {
        console.error('Veritabanı kopyalama hatası:', e)
      }
    }
  }
}

// 4. Prisma Client'ı Başlatma
// Logları production'da kapatabilirsiniz, debug için açık bırakıldı.
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  },
  ...(app.isPackaged
    ? {
        // Production için özel config (Schema yerini gösteriyoruz)
        // Not: Modern Prisma versiyonlarında bazen __internal ayarları gerekebilir
        // ancak genellikle datasource URL'i yeterlidir.
        // Eğer "Query Engine not found" hatası devam ederse burayı özelleştirmek gerekebilir.
      }
    : {})
})

export { prisma, dbPath }
