import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useInventory } from '@/hooks/useInventory'
import { useOrder } from '@/hooks/useOrder'
import { useSound } from '@/hooks/useSound'
import { Product } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useTableStore } from '@/store/useTableStore'
import { ArrowLeft, LayoutGrid, List, Search, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PaymentModal } from '../payments/PaymentModal'
import { CartPanel } from './CartPanel'
import { ProductCard } from './ProductCard'
import { getCategoryIcon } from './order-icons'

interface OrderViewProps {
  onBack: () => void
}

export function OrderView({ onBack }: OrderViewProps): React.JSX.Element {
  const selectedTableId = useTableStore((state) => state.selectedTableId)
  const selectedTableName = useTableStore((state) => state.selectedTableName)

  // Hooks
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
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  // Defer rendering of heavy content to allow animation to start smoothly
  const [isReady, setIsReady] = useState(false)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('orderViewMode') as 'grid' | 'list') || 'grid'
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Progressive Loading State
  const [visibleLimit, setVisibleLimit] = useState(40)
  const observerTarget = useRef<HTMLDivElement>(null)
  // Use double requestAnimationFrame to ensure the first frame (animation start) is painted
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReady(true)
      })
    })
  }, [])

  // Keyboard shortcuts: Ctrl+F for search, ESC to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ctrl+F → Focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // ESC → Go back to tables (only if not in an input/textarea)
      if (e.key === 'Escape') {
        const activeElement = document.activeElement
        const isInInput =
          activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
        if (!isInInput) {
          onBack()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onBack])

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesSearch = searchQuery
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
      const matchesCategory = activeCategory ? product.categoryId === activeCategory : true
      return matchesSearch && matchesCategory
    })

    // Group by category if needed, or just sort
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [products, searchQuery, activeCategory])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleLimit((prev) => prev + 40)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget)
    }
  }, [observerTarget, filteredProducts.length])

  const favoriteProducts = products.filter((p) => p.isFavorite)

  const handleAddToCart = useCallback(
    (product: Product): void => {
      // Optimistic update handled in useOrder
      addItem({ product, quantity: 1 })
    },
    [addItem]
  )

  // Stable callbacks for CartPanel (React.memo)
  const handlePaymentClick = useCallback(() => setIsPaymentOpen(true), [])
  const handleUpdateItem = useCallback(
    (itemId: string, qty: number) => updateItem({ orderItemId: itemId, quantity: qty }),
    [updateItem]
  )
  const handleRemoveItem = useCallback((itemId: string) => removeItem(itemId), [removeItem])
  const handleToggleLock = useCallback(() => toggleLock(), [toggleLock])
  const handleDeleteOrder = useCallback((orderId: string) => deleteOrder(orderId), [deleteOrder])

  /* Keyboard navigation removed as per request */

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Categories & Search */}
      <div className="w-60 bg-background border-r border-border flex flex-col h-full min-h-0 animate-in slide-in-from-left duration-300">
        <div className="p-4 pt-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 mb-2 w-full justify-start hover:bg-muted/50 transition-all duration-300 rounded-lg text-[10px] font-bold uppercase tracking-[0.1em] h-10"
          >
            <ArrowLeft className="w-4 h-4" />
            Masalara Dön
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/80" />
            <Input
              ref={searchInputRef}
              placeholder="Ürün ara..."
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setVisibleLimit(40)
              }}
              className="pl-9 h-10 bg-muted/20 border-border/5 focus:bg-muted/40 transition-all rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="px-3 pb-2 flex-1 flex flex-col min-h-0">
          <Tabs defaultValue="categories" className="w-full flex-1 flex flex-col min-h-0">
            <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/30 h-11 mb-4 rounded-xl border border-border/10 flex-shrink-0">
              <TabsTrigger
                value="categories"
                className="text-[12px] font-bold rounded-lg transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-none outline-none group"
              >
                Kategoriler
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="text-[12px] font-bold rounded-lg transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border-none outline-none group gap-2"
              >
                <Star className="w-3.5 h-3.5 fill-muted-foreground/60 group-data-[state=active]:fill-primary/80 group-data-[state=active]:text-primary transition-all duration-300" />
                Favoriler
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="categories"
              className="flex-1 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col min-h-0"
            >
              <ScrollArea className="h-full w-full px-3">
                <div className="flex flex-col gap-1.5 pb-4">
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-11 rounded-2xl gap-3 px-4 font-bold transition-all relative overflow-hidden group/cat',
                      activeCategory === null
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                        : 'text-muted-foreground/60 hover:bg-muted/40 hover:text-foreground'
                    )}
                    onClick={() => {
                      setActiveCategory(null)
                      setVisibleLimit(40)
                      playTabChange()
                    }}
                  >
                    <LayoutGrid
                      className={cn(
                        'w-4 h-4 transition-transform duration-300',
                        activeCategory === null ? 'scale-110' : 'group-hover/cat:scale-110'
                      )}
                    />
                    Tümü
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-11 rounded-2xl gap-3 px-4 font-bold transition-all relative overflow-hidden group/cat',
                        activeCategory === category.id
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10'
                          : 'text-muted-foreground/85 hover:bg-muted/40 hover:text-foreground'
                      )}
                      onClick={() => {
                        setActiveCategory(category.id)
                        setVisibleLimit(40)
                        playTabChange()
                      }}
                    >
                      <div
                        className={cn(
                          'transition-transform duration-300',
                          activeCategory === category.id ? 'scale-110' : 'group-hover/cat:scale-110'
                        )}
                      >
                        {getCategoryIcon(category.icon, 'w-4 h-4')}
                      </div>
                      {category.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="favorites"
              className="flex-1 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col min-h-0"
            >
              <div className="flex-1 w-full h-full overflow-y-auto px-3 custom-scrollbar">
                <div className="flex flex-col gap-2 pr-1 pb-4 pt-1">
                  {favoriteProducts.map((product) => (
                    <div
                      key={product.id}
                      className="animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <ProductCard
                        product={product}
                        compact={true}
                        showIcon={false}
                        isLocked={isLocked}
                        onAdd={handleAddToCart}
                      />
                    </div>
                  ))}
                  {favoriteProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50 gap-2">
                      <Star className="w-8 h-8 opacity-40" />
                      <p className="text-xs font-medium">Favori ürün yok</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Center Panel - Products Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        <div className="z-10 relative h-14 px-6 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {selectedTableName || 'Masa'}
            </h2>
            <div className="h-4 w-[1px] bg-border" />
            <span className="text-muted-foreground/80 font-bold tracking-[0.2em] text-[10px] uppercase">
              SİPARİŞ
            </span>
          </div>

          <div className="flex items-center bg-muted/20 p-1 rounded-xl border border-border/5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewMode('grid')
                localStorage.setItem('orderViewMode', 'grid')
              }}
              className={cn(
                'w-9 h-8 rounded-lg outline-none transition-all duration-300',
                viewMode === 'grid'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/80 hover:text-foreground hover:bg-muted/50'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setViewMode('list')
                localStorage.setItem('orderViewMode', 'list')
              }}
              className={cn(
                'w-9 h-8 rounded-lg outline-none transition-all duration-300',
                viewMode === 'list'
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-muted/50'
              )}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="p-4 pb-24">
            {isInventoryLoading || !isReady ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Product Skeletons */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-[2rem]" />
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  'gap-2.5 gpu-accelerated',
                  viewMode === 'grid'
                    ? 'grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))]'
                    : 'flex flex-col max-w-4xl mx-auto px-4'
                )}
              >
                {filteredProducts.slice(0, visibleLimit).map((product) => (
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
            )}

            {/* Loading Sentinel */}
            {filteredProducts.length > visibleLimit && (
              <div ref={observerTarget} className="h-8 w-full flex items-center justify-center p-4">
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse [animation-delay:-0.15s] mx-1.5" />
                <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-pulse" />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
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
        onProcessPayment={async (amount, method) => {
          await processPayment({ amount, method })
          return Promise.resolve()
        }}
        onMarkItemsPaid={async (items) => {
          await markItemsPaid(items)
          return Promise.resolve()
        }}
        onPaymentComplete={() => {
          setIsPaymentOpen(false)
          playSuccess()
          onBack() // Navigate back to table list after successful payment
        }}
      />
    </div>
  )
}
