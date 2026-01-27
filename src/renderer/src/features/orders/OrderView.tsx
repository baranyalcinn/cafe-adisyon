import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, Star, Grid } from 'lucide-react'
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

  // Ctrl+F shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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
      <div className="w-72 glass-panel flex flex-col h-full min-h-0 animate-in slide-in-from-left duration-300">
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
              className="pl-9"
            />
          </div>
        </div>

        <Tabs defaultValue="categories" className="flex-1 flex flex-col pt-4 min-h-0">
          <div className="px-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="categories" className="gap-1">
                <Grid className="w-3 h-3" />
                Kategoriler
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-1">
                <Star className="w-3 h-3" />
                Favoriler
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="categories"
            className="flex-1 p-4 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
          >
            <ScrollArea className="h-full">
              <div className="space-y-1.5 px-2">
                <Button
                  variant={activeCategory === null ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-12 rounded-2xl gap-3 px-4 font-bold transition-all',
                    activeCategory === null && 'bg-primary/10 text-primary border-primary/20'
                  )}
                  onClick={() => setActiveCategory(null)}
                >
                  <Grid className="w-4 h-4" />
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
                  <p className="text-sm text-muted-foreground text-center py-4">Favori ürün yok</p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Center Panel - Products Grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background/50">
        <div className="sticky top-0 z-20 px-8 py-5 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-tight text-foreground uppercase italic pb-0.5">
                  {selectedTable?.name || 'Masa'}
                </h2>
                <div className="h-6 w-px bg-border/40 mx-1" />
                <span className="text-primary font-bold tracking-tight text-xl">Sipariş</span>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-muted/30 p-1.5 rounded-2xl border border-border/40 shadow-inner">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('grid')
                localStorage.setItem('orderViewMode', 'grid')
              }}
              className={cn(
                'rounded-xl px-4 gap-2 h-9 font-bold',
                viewMode === 'grid' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground'
              )}
            >
              <Grid className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setViewMode('list')
                localStorage.setItem('orderViewMode', 'list')
              }}
              className={cn(
                'rounded-xl px-4 gap-2 h-9 font-bold',
                viewMode === 'list' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="flex flex-col gap-0.5 items-center justify-center">
                <div className="w-3.5 h-0.5 bg-current rounded-full" />
                <div className="w-3.5 h-0.5 bg-current rounded-full" />
                <div className="w-3.5 h-0.5 bg-current rounded-full" />
              </div>
              <span className="hidden sm:inline">Liste</span>
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
