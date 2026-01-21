import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Search, Star, Grid } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { useTableStore } from '@/store/useTableStore'
import { useOrderStore } from '@/store/useOrderStore'
import { cafeApi, type Product, type Category } from '@/lib/api'
import { ProductCard } from './ProductCard'
import { CartPanel } from './CartPanel'
import { PaymentModal } from '../payments/PaymentModal'

interface OrderViewProps {
  onBack: () => void
}

export function OrderView({ onBack }: OrderViewProps): React.JSX.Element {
  const { selectedTableId, tables } = useTableStore()
  const { loadOrderForTable } = useOrderStore()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedTable = tables.find((t) => t.id === selectedTableId)

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        const [productsData, categoriesData] = await Promise.all([
          cafeApi.products.getAll(),
          cafeApi.categories.getAll()
        ])
        setProducts(productsData)
        setCategories(categoriesData)
      } catch (error) {
        console.error('Failed to load data:', error)
      }
    }
    loadData()
  }, [])

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
    <div className="flex h-full">
      {/* Left Panel - Categories & Search */}
      <div className="w-64 border-r bg-card flex flex-col h-full min-h-0">
        <div className="p-4 border-b">
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
              <div className="space-y-2">
                <Button
                  variant={activeCategory === null ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveCategory(null)}
                >
                  Tümü
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveCategory(category.id)}
                  >
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
        <div className="p-4 border-b bg-card">
          <h2 className="text-xl font-semibold">{selectedTable?.name || 'Masa'} - Sipariş</h2>
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} ürün listeleniyor
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
