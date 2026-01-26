import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, Star, Grid } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useTableStore } from '@/store/useTableStore'
import { useOrderStore } from '@/store/useOrderStore'
import { useInventoryStore } from '@/store/useInventoryStore'
import { ProductCard } from './ProductCard'
import { getCategoryIcon } from './order-icons'
import { CartPanel } from './CartPanel'
import { PaymentModal } from '../payments/PaymentModal'
import { cn } from '@/lib/utils'

interface OrderViewProps {
  onBack: () => void
}

export function OrderView({ onBack }: OrderViewProps): React.JSX.Element {
  const selectedTableId = useTableStore((state) => state.selectedTableId)
  const tables = useTableStore((state) => state.tables)
  const loadOrderForTable = useOrderStore((state) => state.loadOrderForTable)
  const products = useInventoryStore((state) => state.products)
  const categories = useInventoryStore((state) => state.categories)
  const fetchInventory = useInventoryStore((state) => state.fetchInventory)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedTable = tables.find((t) => t.id === selectedTableId)

  useEffect(() => {
    fetchInventory() // Uses cache if possible
  }, [fetchInventory])

  useEffect(() => {
    if (selectedTableId) {
      loadOrderForTable(selectedTableId)
    }
  }, [selectedTableId, loadOrderForTable])

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

  const favoriteProducts = products.filter((p) => p.isFavorite)

  return (
    <div className="flex h-full bg-background/95">
      {/* Left Panel - Categories & Search */}
      <div className="w-72 glass-panel flex flex-col h-full min-h-0 animate-in slide-in-from-left duration-300">
        <div className="p-6">
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-4 w-full justify-start">
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
                  <ProductCard key={product.id} product={product} compact />
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 bg-transparent">
          <h2 className="text-3xl font-black tracking-tighter uppercase text-foreground/90 leading-none">
            {selectedTable?.name || 'Masa'}
            <span className="text-primary ml-2 inline-block">SİPARİŞ</span>
          </h2>
          <p className="text-[10px] font-black text-muted-foreground mt-2 uppercase tracking-[0.3em]">
            {filteredProducts.length} ÜRÜN LİSTELENİYOR
          </p>
        </div>

        <ScrollArea className="flex-1 h-full">
          <div className="p-4 pb-24">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>Ürün bulunamadı</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Cart */}
      <CartPanel
        onPaymentClick={() => setIsPaymentOpen(true)}
        tableName={selectedTable?.name || 'Masa'}
      />

      {/* Payment Modal */}
      <PaymentModal
        open={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        onPaymentComplete={onBack}
      />
    </div>
  )
}
