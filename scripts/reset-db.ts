import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import path from 'path'

// Database path for standalone execution
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')

// Create adapter
const adapter = new PrismaLibSql({
  url: `file:${dbPath}`
})

// Create client with adapter
const prisma = new PrismaClient({ adapter })

async function reset(): Promise<void> {
  console.log('Resetting database...')
  console.log(`Target database: ${dbPath}`)

  try {
    // Delete all data in reverse order of dependencies
    await prisma.$connect()

    await prisma.$transaction([
      prisma.transaction.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.product.deleteMany(),
      prisma.category.deleteMany(),
      prisma.table.deleteMany()
    ])

    console.log('Database cleared.')

    // Create categories
    console.log('Seeding categories...')
    await prisma.category.createMany({
      data: [
        { id: 'cat-sicak', name: 'Sıcak İçecekler', icon: 'coffee' },
        { id: 'cat-soguk', name: 'Soğuk İçecekler', icon: 'ice-cream' },
        { id: 'cat-yiyecek', name: 'Yiyecekler', icon: 'utensils' },
        { id: 'cat-tatli', name: 'Tatlılar', icon: 'cake' }
      ]
    })

    // Create products
    console.log('Seeding products...')
    const products = [
      { name: 'Türk Kahvesi', price: 6000, categoryId: 'cat-sicak', isFavorite: true },
      { name: 'Double Türk Kahvesi', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Espresso', price: 5500, categoryId: 'cat-sicak', isFavorite: true },
      { name: 'Double Espresso', price: 7000, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Americano', price: 6500, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Latte', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
      { name: 'Cappuccino', price: 7500, categoryId: 'cat-sicak', isFavorite: true },
      { name: 'Flat White', price: 7500, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Caramel Macchiato', price: 8500, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Filtre Kahve', price: 6000, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Çay', price: 2500, categoryId: 'cat-sicak', isFavorite: true },
      { name: 'Fincan Çay', price: 3500, categoryId: 'cat-sicak', isFavorite: false },
      {
        name: 'Bitki Çayı (Yeşil/Ihlamur)',
        price: 5000,
        categoryId: 'cat-sicak',
        isFavorite: false
      },
      { name: 'Sıcak Çikolata', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Salep', price: 8000, categoryId: 'cat-sicak', isFavorite: false },
      { name: 'Ice Latte', price: 8000, categoryId: 'cat-soguk', isFavorite: true },
      { name: 'Ice Americano', price: 7000, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'Ice Caramel Macchiato', price: 9000, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'House Frappe', price: 9500, categoryId: 'cat-soguk', isFavorite: true },
      { name: 'Milkshake (Çil/Muz/Özel)', price: 9500, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'Ev Yapımı Limonata', price: 6000, categoryId: 'cat-soguk', isFavorite: true },
      { name: 'Churchill', price: 5000, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'Taze Portakal Suyu', price: 8000, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'Su (33cl)', price: 1500, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'Soda', price: 2500, categoryId: 'cat-soguk', isFavorite: false },
      { name: 'Kaşarlı Tost', price: 8000, categoryId: 'cat-yiyecek', isFavorite: true },
      { name: 'Karışık Tost', price: 9500, categoryId: 'cat-yiyecek', isFavorite: true },
      { name: 'Soğuk Sandviç', price: 8500, categoryId: 'cat-yiyecek', isFavorite: false },
      { name: 'Patates Cips', price: 7000, categoryId: 'cat-yiyecek', isFavorite: true },
      { name: 'Sigara Böreği (6 lı)', price: 8000, categoryId: 'cat-yiyecek', isFavorite: false },
      { name: 'San Sebastian Cheesecake', price: 14000, categoryId: 'cat-tatli', isFavorite: true },
      { name: 'Limonlu Cheesecake', price: 13000, categoryId: 'cat-tatli', isFavorite: false },
      {
        name: 'Belçika Çikolatalı Brownie',
        price: 11000,
        categoryId: 'cat-tatli',
        isFavorite: true
      },
      { name: 'Çilekli Magnolia', price: 9000, categoryId: 'cat-tatli', isFavorite: false },
      { name: 'Tiramisu', price: 11000, categoryId: 'cat-tatli', isFavorite: true },
      { name: 'Waffle', price: 15000, categoryId: 'cat-tatli', isFavorite: false }
    ]

    for (const product of products) {
      await prisma.product.create({
        data: {
          id: `prod-${product.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')}`,
          ...product
        }
      })
    }

    // Create tables
    console.log('Seeding tables...')
    for (let i = 1; i <= 12; i++) {
      await prisma.table.create({
        data: { id: `table-${i}`, name: `Masa ${i}` }
      })
    }

    console.log('Database reset and seed successful!')
  } catch (error) {
    console.error('Error resetting database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

reset()
