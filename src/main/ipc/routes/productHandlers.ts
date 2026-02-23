import { Prisma } from '../../../generated/prisma/client'
import { productSchemas } from '../../../shared/ipc-schemas'
import { IPC_CHANNELS } from '../../../shared/types'
import { productService } from '../../services/ProductService'
import { createSimpleHandler, createValidatedHandler } from '../utils/ipcWrapper'

export function registerProductHandlers(): void {
  // GET ALL
  createSimpleHandler(
    IPC_CHANNELS.PRODUCTS_GET_ALL,
    () => productService.getAllProducts(),
    'Ürünler getirilirken hata oluştu'
  )

  // CREATE
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_CREATE,
    productSchemas.create,
    (data) => {
      const { categoryId, ...rest } = data
      return productService.createProduct({
        ...rest,
        category: { connect: { id: categoryId } }
      })
    },
    'Ürün oluşturulurken hata oluştu'
  )

  // UPDATE
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_UPDATE,
    productSchemas.update,
    (data) => {
      const { categoryId, ...rest } = data.data
      const updateData: Prisma.ProductUpdateInput = { ...rest }
      if (categoryId) {
        updateData.category = { connect: { id: categoryId } }
      }
      return productService.updateProduct(data.id, updateData)
    },
    'Ürün güncellenirken hata oluştu'
  )

  // DELETE
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_DELETE,
    productSchemas.delete,
    (data) => productService.deleteProduct(data.id),
    'Ürün silinirken hata oluştu'
  )

  // GET BY CATEGORY
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY,
    productSchemas.getByCategory,
    (data) => productService.getProductsByCategory(data.categoryId),
    'Kategori ürünleri getirilirken hata oluştu'
  )

  // GET FAVORITES
  createSimpleHandler(
    IPC_CHANNELS.PRODUCTS_GET_FAVORITES,
    () => productService.getFavorites(),
    'Favori ürünler getirilirken hata oluştu'
  )

  // SEARCH
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_SEARCH,
    productSchemas.search,
    (data) => productService.searchProducts(data.query),
    'Ürün araması yapılırken hata oluştu'
  )
}
