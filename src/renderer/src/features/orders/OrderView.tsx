import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, Star, LayoutGrid, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useTableStore } from '@/store/useTableStore'
import { useInventory } from '@/hooks/useInventory'
import { useOrder } from '@/hooks/useOrder'
import { useTables } from '@/hooks/useTables'
import { ProductCard } from './ProductCard'
import { getCategoryIcon } from './order-icons'
import { CartPanel } from './CartPanel'
import { PaymentModal } from '../payments/PaymentModal'
import { cn } from '@/lib/utils'
import { Product } from '@/lib/api'

interface OrderViewProps {
  onBack: () => void
}

export function OrderView({ onBack }: OrderViewProps): React.JSX.Element {
  const selectedTableId = useTableStore((state) => state.selectedTableId)

  // Hooks
  const { products, categories, isLoading: isInventoryLoading } = useInventory()
  const { data: tables = [] } = useTables()
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('orderViewMode') as 'grid' | 'list') || 'grid'
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedTable = tables.find((t) => t.id === selectedTableId)

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
    const matchesCategory = activeCategory ? product.categoryId === activeCategory : true
    return matchesSearch && matchesCategory
  })

  // Group by category if needed, or just sort
  filteredProducts.sort((a, b) => a.name.localeCompare(b.name))

  const favoriteProducts = products.filter((p) => p.isFavorite)

  const handleAddToCart = (product: Product): void => {
    // Optimistic update handled in useOrder
    addItem({ product, quantity: 1 })
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Panel - Categories & Search */}
      <div className="w-72 glass-panel border-r border-white/10 !border-t-0 !border-b-0 flex flex-col h-full min-h-0 animate-in slide-in-from-left duration-300">
        <div className="p-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2 mb-4 w-full justify-start hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Masalara Dön
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Ürün ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-white/10"
            />
          </div>
        </div>

        <div className="px-2 pb-2">
          <Tabs defaultValue="categories" className="w-full">
            <TabsList className="w-full grid grid-cols-2 p-1 bg-background/40 h-10 mb-2">
              <TabsTrigger
                value="categories"
                className="text-xs font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                Kategoriler
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="text-xs font-bold data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                <Star className="w-3 h-3 mr-1.5 fill-current" />
                Favoriler
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="categories"
              className="flex-1 p-0 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col h-[calc(100vh-220px)]"
            >
              <ScrollArea className="h-full w-full px-4">
                <div className="flex flex-col gap-2 pb-4">
                  <Button
                    variant={activeCategory === null ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start h-12 rounded-2xl gap-3 px-4 font-bold transition-all',
                      activeCategory === null && 'bg-primary/10 text-primary border-primary/20'
                    )}
                    onClick={() => setActiveCategory(null)}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    Tümü
                  </Button>
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start h-12 rounded-2xl gap-3 px-4 font-bold transition-all',
                        activeCategory === category.id &&
                          'bg-primary/10 text-primary border-primary/20'
                      )}
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {getCategoryIcon(category.icon, 'w-4 h-4')}
                      {category.name}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="favorites"
              className="flex-1 p-4 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
            >
              <ScrollArea className="h-full w-full">
                <div className="flex flex-col gap-2 pr-5">
                  {favoriteProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      compact
                      isLocked={isLocked}
                      onAdd={handleAddToCart}
                    />
                  ))}
                  {favoriteProducts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Favori ürün yok
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Center Panel - Products Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden section-panel glass-panel !border-t-0 !border-b-0">
        <div className="z-10 relative h-16 px-6 border-b border-white/10 bg-gradient-to-r from-background via-background/95 to-background flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-black tracking-tight text-foreground uppercase">
              {selectedTable?.name || 'Masa'}
            </h2>
            <div className="h-5 w-px bg-border/30" />
            <span className="text-primary/80 font-semibold tracking-tight text-base">Sipariş</span>
          </div>

          <div className="flex items-center bg-muted/20 p-1 rounded-xl border border-white/5 shadow-inner backdrop-blur-sm">
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
                  ? 'bg-background text-primary shadow-md shadow-black/20'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5'
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
                  ? 'bg-background text-primary shadow-md shadow-black/20'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5'
              )}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="p-4 pb-24">
            {isInventoryLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Product Skeletons */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-[2rem]" />
                ))}
              </div>
            ) : (
              <div
                className={cn(
                  'gap-2.5',
                  viewMode === 'grid'
                    ? 'grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))]'
                    : 'flex flex-col max-w-4xl mx-auto px-4'
                )}
              >
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compact={viewMode === 'list'}
                    isLocked={isLocked}
                    onAdd={handleAddToCart}
                  />
                ))}
              </div>
            )}

            {!isInventoryLoading && filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ürün bulunamadı</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
      <CartPanel
        order={order}
        tableName={selectedTable?.name || 'Masa'}
        isLocked={isLocked}
        onPaymentClick={() => setIsPaymentOpen(true)}
        onUpdateItem={(itemId, qty) => updateItem({ orderItemId: itemId, quantity: qty })}
        onRemoveItem={(itemId) => removeItem(itemId)}
        onToggleLock={() => toggleLock()}
        onDeleteOrder={(orderId) => deleteOrder(orderId)}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentComplete={onBack}
        order={order}
        onProcessPayment={async (amount, method) => {
          await processPayment({ amount, method })
        }}
        onMarkItemsPaid={markItemsPaid}
      />
    </div>
  )
}
