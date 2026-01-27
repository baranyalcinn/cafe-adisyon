import { ipcMain } from 'electron'
import { Prisma } from '../../../generated/prisma/client'
import { IPC_CHANNELS } from '../../../shared/types'
import { productService } from '../../services/ProductService'

import { productSchemas, validateInput } from '../../../shared/ipc-schemas'

export function registerProductHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_ALL, async () => productService.getAllProducts())

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_CREATE, async (_, data) => {
    const validation = validateInput(productSchemas.create, data)
    if (!validation.success) throw new Error(validation.error)
    const { categoryId, ...rest } = validation.data
    return productService.createProduct({
      ...rest,
      category: { connect: { id: categoryId } }
    })
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_UPDATE, async (_, id, data) => {
    const validation = validateInput(productSchemas.update, { id, data })
    if (!validation.success) throw new Error(validation.error)

    const { categoryId, ...rest } = validation.data.data
    const updateData: Prisma.ProductUpdateInput = { ...rest }
    if (categoryId) {
      updateData.category = { connect: { id: categoryId } }
    }

    return productService.updateProduct(validation.data.id, updateData)
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_DELETE, async (_, id) => {
    const validation = validateInput(productSchemas.delete, { id })
    if (!validation.success) throw new Error(validation.error)
    return productService.deleteProduct(validation.data.id)
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY, async (_, categoryId) => {
    const validation = validateInput(productSchemas.getByCategory, { categoryId })
    if (!validation.success) throw new Error(validation.error)
    return productService.getProductsByCategory(validation.data.categoryId)
  })

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_FAVORITES, async () => productService.getFavorites())

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH, async (_, query) => {
    const validation = validateInput(productSchemas.search, { query })
    if (!validation.success) throw new Error(validation.error)
    return productService.searchProducts(validation.data.query)
  })
}
