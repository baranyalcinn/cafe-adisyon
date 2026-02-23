import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInventory } from '@/hooks/useInventory'
import { useOrder } from '@/hooks/useOrder'
import { useSound } from '@/hooks/useSound'
import type { Category, Product } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'
import { ArrowLeft, LayoutGrid, List, Search, Star, X } from 'lucide-react'
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { PaymentModal } from '../payments/PaymentModal'
import { CartPanel } from './CartPanel'
import { ProductCard } from './ProductCard'
import { getCategoryIcon } from './order-icons'

const INITIAL_VISIBLE_LIMIT = 40

interface FavoriteProductRowProps {
  product: Product
  isLocked: boolean
  onAdd: (product: Product) => void
}

const FavoriteProductRow = React.memo(function FavoriteProductRow({
  product,
  isLocked,
  onAdd
}: FavoriteProductRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={isLocked}
      className={cn(
        'w-full group flex items-center gap-3 rounded-[14px] border px-3 py-3 text-left transition-all duration-200',
        isLocked
          ? 'border-border/30 bg-muted/10 opacity-60 cursor-not-allowed'
          : 'border-border/40 bg-background/50 hover:bg-muted/40 hover:border-border/70 active:scale-[0.99] shadow-sm'
      )}
      title={isLocked ? 'Sipariş kilitli' : `${product.name} sepete ekle`}
      aria-label={`${product.name} sepete ekle`}
    >
      {/* Sol ikon alanı */}
      <div className="w-8 h-8 rounded-[10px] bg-amber-500/10 flex items-center justify-center shrink-0">
        <Star className="w-4 h-4 text-amber-500 fill-amber-500/80" />
      </div>

      {/* İçerik */}
      <div className="min-w-0 flex-1 pr-1">
        <p className="text-[13px] font-bold text-foreground leading-tight line-clamp-2">
          {product.name}
        </p>
      </div>
    </button>
  )
})

// ==========================================
// 1. SOL PANEL (SIDEBAR) BİLEŞENİ
// ==========================================
interface OrderSidebarProps {
  onBack: () => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  activeCategory: string | null
  setActiveCategory: (val: string | null) => void
  categories: Category[]
  favoriteProducts: Product[]
  favoriteProductsFiltered: Product[]
  isLocked: boolean
  onAddToCart: (product: Product) => void
  playTabChange: () => void
  resetVisibleLimit: () => void
  searchInputRef: React.RefObject<HTMLInputElement | null>
}

const OrderSidebar = React.memo(function OrderSidebar({
  onBack,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  favoriteProducts,
  favoriteProductsFiltered,
  isLocked,
  onAddToCart,
  playTabChange,
  resetVisibleLimit,
  searchInputRef
}: OrderSidebarProps) {
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value)
      resetVisibleLimit()
    },
    [setSearchQuery, resetVisibleLimit]
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    resetVisibleLimit()
    searchInputRef.current?.focus()
  }, [setSearchQuery, resetVisibleLimit, searchInputRef])

  return (
    <div className="w-60 bg-background border-r border-border flex flex-col h-full min-h-0 animate-in slide-in-from-left duration-300">
      <div className="p-4 pt-6 space-y-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 w-full justify-start hover:bg-muted/50 hover:translate-x-1 transition-all duration-300 rounded-xl text-sm font-black h-10 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Vazgeç
        </Button>

        <div className="group relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
          <Input
            ref={searchInputRef}
            value={searchQuery}
            placeholder="Ürün ara..."
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10 h-11 bg-muted/20 border-border/10 focus:bg-muted/40 transition-all rounded-[1rem] text-sm font-medium focus:ring-1 focus:ring-primary/20"
          />
          {searchQuery.trim() && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60"
              aria-label="Aramayı temizle"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-3 pb-2 flex-1 flex flex-col min-h-0">
        <Tabs defaultValue="categories" className="w-full flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/30 h-12 mb-6 rounded-2xl border border-border/10 flex-shrink-0">
            <TabsTrigger
              value="categories"
              className="text-[13px] font-black rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg border-none outline-none"
            >
              Menü
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="text-[13px] font-black rounded-xl transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-lg border-none outline-none group gap-2"
            >
              <Star className="w-3.5 h-3.5 fill-muted-foreground/60 group-data-[state=active]:fill-amber-500 group-data-[state=active]:text-amber-500 transition-all duration-300" />
              Özel
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="categories"
            className="flex-1 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col min-h-0"
          >
            <ScrollArea className="h-full w-full">
              <div className="flex flex-col gap-1 pb-4">
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start h-14 rounded-2xl gap-4 px-4 font-black text-[13px] transition-all relative overflow-hidden group/cat border border-transparent',
                    activeCategory === null
                      ? 'bg-primary/5 text-primary border-primary/10'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  )}
                  onClick={() => {
                    setActiveCategory(null)
                    resetVisibleLimit()
                    playTabChange()
                  }}
                >
                  {activeCategory === null && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <div
                    className={cn(
                      'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300',
                      activeCategory === null
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted/40 group-hover/cat:bg-muted/60'
                    )}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <span className="truncate flex-1 text-left">Tümü</span>
                </Button>

                {categories.map((category) => {
                  const isActive = activeCategory === category.id

                  return (
                    <Button
                      key={category.id}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-14 rounded-2xl gap-4 px-4 font-black text-[13px] transition-all relative overflow-hidden group/cat border border-transparent',
                        isActive
                          ? 'bg-primary/5 text-primary border-primary/10'
                          : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                      )}
                      onClick={() => {
                        setActiveCategory(category.id)
                        resetVisibleLimit()
                        playTabChange()
                      }}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                      )}
                      <div
                        className={cn(
                          'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted/40 group-hover/cat:bg-muted/60'
                        )}
                      >
                        {getCategoryIcon(category.icon, 'w-5 h-5')}
                      </div>
                      <span className="truncate flex-1 text-left">{category.name}</span>
                    </Button>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="favorites"
            className="flex-1 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col min-h-0"
          >
            <div className="flex-1 w-full h-full overflow-y-auto pl-3 pr-2 custom-scrollbar">
              <div className="flex flex-col gap-1.5 pb-4 pt-1">
                {favoriteProductsFiltered.map((product) => (
                  <div
                    key={product.id}
                    className="animate-in fade-in slide-in-from-left-2 duration-300"
                  >
                    <FavoriteProductRow product={product} isLocked={isLocked} onAdd={onAddToCart} />
                  </div>
                ))}

                {favoriteProducts.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 gap-2">
                    <Star className="w-8 h-8 opacity-40" />
                    <p className="text-xs font-medium">Favori ürün yok</p>
                  </div>
                )}

                {favoriteProducts.length > 0 && favoriteProductsFiltered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 gap-2 text-center px-2">
                    <Search className="w-7 h-7 opacity-40" />
                    <p className="text-xs font-medium">Favorilerde sonuç yok</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
})

// ==========================================
// 2. ANA EKRAN (ORDER VIEW) BİLEŞENİ
// ==========================================
interface OrderViewProps {
  onBack: () => void
}

export function OrderView({ onBack }: OrderViewProps): React.JSX.Element {
  const selectedTableId = useTableStore((state) => state.selectedTableId)
  const selectedTableName = useTableStore((state) => state.selectedTableName)

  const { products, categories, isLoading: isInventoryLoading } = useInventory()
  const { playTabChange, playSuccess } = useSound()
  const {
    order,
    addItem,
    updateItem,
    removeItem,
    toggleLock,
    deleteOrder,
    processPayment,
    markItemsPaid,
    isLocked
  } = useOrder(selectedTableId)

  const [searchQuery, setSearchQuery] = useState('')
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_LIMIT)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    const saved = localStorage.getItem('orderViewMode')
    return saved === 'grid' || saved === 'list' ? saved : 'grid'
  })

  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sayfa yüklenme animasyonu
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReady(true)
      })
    })
  }, [])

  // View mode persist
  useEffect(() => {
    localStorage.setItem('orderViewMode', viewMode)
  }, [viewMode])

  // Klavye Kısayolları (Modal güvenli)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      if (e.key === 'Escape') {
        // Payment modal açıksa ana sayfadan çıkma; modal kendi ESC'sini yönetsin
        if (isPaymentOpen) return

        const activeElement = document.activeElement
        const isInInput =
          activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement

        if (!isInInput) onBack()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack, isPaymentOpen])

  const resetVisibleLimit = useCallback(() => {
    setVisibleLimit(INITIAL_VISIBLE_LIMIT)
  }, [])

  // Ürünleri bir kez sırala (Türkçe locale)
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }, [products])

  const normalizedQuery = useMemo(
    () => deferredSearchQuery.trim().toLocaleLowerCase('tr'),
    [deferredSearchQuery]
  )

  // Filtrelenmiş ürünler
  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((product) => {
      const matchesSearch = normalizedQuery
        ? product.name.toLocaleLowerCase('tr').includes(normalizedQuery)
        : true

      const matchesCategory = activeCategory ? product.categoryId === activeCategory : true
      return matchesSearch && matchesCategory
    })
  }, [sortedProducts, normalizedQuery, activeCategory])

  const favoriteProducts = useMemo(
    () => sortedProducts.filter((p) => p.isFavorite),
    [sortedProducts]
  )

  const favoriteProductsFiltered = useMemo(() => {
    if (!normalizedQuery) return favoriteProducts
    return favoriteProducts.filter((p) => p.name.toLocaleLowerCase('tr').includes(normalizedQuery))
  }, [favoriteProducts, normalizedQuery])

  // Güvenli sayfalama (Intersection Observer)
  const observer = useRef<IntersectionObserver | null>(null)
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isInventoryLoading) return
      if (observer.current) observer.current.disconnect()

      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleLimit((prev) =>
              Math.min(prev + INITIAL_VISIBLE_LIMIT, filteredProducts.length)
            )
          }
        },
        { threshold: 0.1 }
      )

      if (node) observer.current.observe(node)
    },
    [isInventoryLoading, filteredProducts.length]
  )

  // Sepet İşlemleri
  const handleAddToCart = useCallback(
    (product: Product) => addItem({ product, quantity: 1 }),
    [addItem]
  )
  const handlePaymentClick = useCallback(() => setIsPaymentOpen(true), [])
  const handleUpdateItem = useCallback(
    (itemId: string, qty: number) => updateItem({ orderItemId: itemId, quantity: qty }),
    [updateItem]
  )
  const handleRemoveItem = useCallback((itemId: string) => removeItem(itemId), [removeItem])
  const handleToggleLock = useCallback(() => toggleLock(), [toggleLock])
  const handleDeleteOrder = useCallback((orderId: string) => deleteOrder(orderId), [deleteOrder])

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleLimit),
    [filteredProducts, visibleLimit]
  )

  return (
    <div className="flex h-full bg-background">
      {/* 1. Sol Panel (Kategoriler & Arama) */}
      <OrderSidebar
        onBack={onBack}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        categories={categories}
        favoriteProducts={favoriteProducts}
        favoriteProductsFiltered={favoriteProductsFiltered}
        isLocked={isLocked}
        onAddToCart={handleAddToCart}
        playTabChange={playTabChange}
        resetVisibleLimit={resetVisibleLimit}
        searchInputRef={searchInputRef}
      />

      {/* 2. Orta Panel (Ürün Listesi) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        <div className="z-10 relative h-14 px-6 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-foreground tabular-nums truncate">
              {selectedTableName || 'Masa'}
            </h2>
            <div className="h-4 w-px bg-border shrink-0" />
            <span className="text-muted-foreground/80 font-bold tracking-[0.2em] text-[10px] shrink-0">
              SİPARİŞ
            </span>
          </div>

          <div className="flex items-center bg-muted/20 p-1 rounded-xl border border-border/5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(
                'w-9 h-8 rounded-lg outline-none transition-all duration-300',
                viewMode === 'grid'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50'
              )}
              aria-label="Grid görünüm"
              title="Grid görünüm"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(
                'w-9 h-8 rounded-lg outline-none transition-all duration-300',
                viewMode === 'list'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
              )}
              aria-label="Liste görünüm"
              title="Liste görünüm"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="p-4 pb-24">
            {isInventoryLoading || !isReady ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-[2rem]" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="min-h-[340px] flex items-center justify-center">
                <div className="max-w-sm w-full text-center rounded-3xl border border-border/50 bg-muted/10 p-6">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Ürün bulunamadı</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aramayı değiştir veya kategori filtresini kaldır.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {searchQuery.trim() && (
                      <Button
                        variant="secondary"
                        className="h-9 rounded-xl"
                        onClick={() => {
                          setSearchQuery('')
                          resetVisibleLimit()
                          searchInputRef.current?.focus()
                        }}
                      >
                        Aramayı Temizle
                      </Button>
                    )}
                    {activeCategory && (
                      <Button
                        variant="outline"
                        className="h-9 rounded-xl"
                        onClick={() => {
                          setActiveCategory(null)
                          resetVisibleLimit()
                          playTabChange()
                        }}
                      >
                        Tüm Kategoriler
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div
                  className={cn(
                    'gap-2.5 gpu-accelerated',
                    viewMode === 'grid'
                      ? 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))]'
                      : 'flex flex-col max-w-4xl mx-auto px-4'
                  )}
                >
                  {visibleProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex h-full gpu-accelerated animate-in fade-in zoom-in-95 duration-300"
                    >
                      <ProductCard
                        product={product}
                        compact={viewMode === 'list'}
                        isLocked={isLocked}
                        onAdd={handleAddToCart}
                      />
                    </div>
                  ))}
                </div>

                {filteredProducts.length > visibleLimit && (
                  <div
                    ref={lastElementRef}
                    className="h-8 w-full flex items-center justify-center p-4"
                  >
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse [animation-delay:-0.3s]" />
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse [animation-delay:-0.15s] mx-1.5" />
                    <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" />
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* 3. Sağ Panel (Sepet ve Ödeme) */}
      <CartPanel
        order={order}
        isLocked={isLocked}
        onPaymentClick={handlePaymentClick}
        onUpdateItem={handleUpdateItem}
        onRemoveItem={handleRemoveItem}
        onToggleLock={handleToggleLock}
        onDeleteOrder={handleDeleteOrder}
      />

      <PaymentModal
        open={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        order={order}
        tableName={selectedTableName}
        onProcessPayment={async (amount, method, options) => {
          await processPayment({ amount, method, options })
        }}
        onMarkItemsPaid={async (items, paymentDetails) => {
          await markItemsPaid(
            items,
            paymentDetails as { amount: number; method: string } | undefined
          )
        }}
        onPaymentComplete={() => {
          setIsPaymentOpen(false)
          playSuccess()
          onBack()
        }}
      />
    </div>
  )
}
