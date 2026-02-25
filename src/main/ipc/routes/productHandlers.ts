import { Prisma } from '../../../generated/prisma/client'
import { productSchemas } from '../../../shared/ipc-schemas'
import { ApiResponse, IPC_CHANNELS, Product } from '../../../shared/types'
import { productService } from '../../services/ProductService'
import { createSimpleHandler, createValidatedHandler } from '../utils/ipcWrapper'

export function registerProductHandlers(): void {
  // ============================================================================
  // GET ALL
  // ============================================================================
  createSimpleHandler(
    IPC_CHANNELS.PRODUCTS_GET_ALL,
    (): Promise<ApiResponse<Product[]>> => productService.getAllProducts(),
    'Ürünler getirilirken hata oluştu'
  )

  // ============================================================================
  // CREATE
  // ============================================================================
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_CREATE,
    productSchemas.create,
    (data): Promise<ApiResponse<Product>> => {
      const { categoryId, ...rest } = data
      return productService.createProduct({
        ...rest,
        category: { connect: { id: categoryId } }
      })
    },
    'Ürün oluşturulurken hata oluştu'
  )

  // ============================================================================
  // UPDATE
  // ============================================================================
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_UPDATE,
    productSchemas.update,
    (data): Promise<ApiResponse<Product>> => {
      const { categoryId, ...rest } = data.data

      const updateData: Prisma.ProductUpdateInput = { ...rest }

      // Kategori güncellenmek istenmişse Prisma relation objesini ekle
      if (categoryId) {
        updateData.category = { connect: { id: categoryId } }
      }

      return productService.updateProduct(data.id, updateData)
    },
    'Ürün güncellenirken hata oluştu'
  )

  // ============================================================================
  // DELETE
  // ============================================================================
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_DELETE,
    productSchemas.delete,
    (data): Promise<ApiResponse<null>> => productService.deleteProduct(data.id),
    'Ürün silinirken hata oluştu'
  )

  // ============================================================================
  // GET BY CATEGORY
  // ============================================================================
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_GET_BY_CATEGORY,
    productSchemas.getByCategory,
    (data): Promise<ApiResponse<Product[]>> =>
      productService.getProductsByCategory(data.categoryId),
    'Kategori ürünleri getirilirken hata oluştu'
  )

  // ============================================================================
  // GET FAVORITES
  // ============================================================================
  createSimpleHandler(
    IPC_CHANNELS.PRODUCTS_GET_FAVORITES,
    (): Promise<ApiResponse<Product[]>> => productService.getFavorites(),
    'Favori ürünler getirilirken hata oluştu'
  )

  // ============================================================================
  // SEARCH
  // ============================================================================
  createValidatedHandler(
    IPC_CHANNELS.PRODUCTS_SEARCH,
    productSchemas.search,
    (data): Promise<ApiResponse<Product[]>> => productService.searchProducts(data.query),
    'Ürün araması yapılırken hata oluştu'
  )
}
