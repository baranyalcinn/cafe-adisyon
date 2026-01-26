import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../../shared/types'
import { productService } from '../../services/ProductService'

export function registerProductHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_ALL, async () => productService.getAllProducts())

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_CREATE, async (_, data) =>
    productService.createProduct(data)
  )

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_UPDATE, async (_, id, data) =>
    productService.updateProduct(id, data)
  )

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_DELETE, async (_, id) => productService.deleteProduct(id))

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY, async (_, categoryId) =>
    productService.getProductsByCategory(categoryId)
  )

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_GET_FAVORITES, async () => productService.getFavorites())

  ipcMain.handle(IPC_CHANNELS.PRODUCTS_SEARCH, async (_, query) =>
    productService.searchProducts(query)
  )
}
