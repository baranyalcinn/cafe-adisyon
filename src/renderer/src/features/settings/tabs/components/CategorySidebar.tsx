import { useState, memo } from 'react'
import { Plus, MoreVertical, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { type Category } from '@/lib/api'

interface CategorySidebarProps {
  categories: Category[]
  selectedCategoryId: string | null
  onSelectCategory: (id: string) => void
  onAddCategory: (name: string) => Promise<void>
  onUpdateCategory: (id: string, name: string) => Promise<void>
  onDeleteCategory: (id: string) => void
}

export const CategorySidebar = memo(
  ({
    categories,
    selectedCategoryId,
    onSelectCategory,
    onAddCategory,
    onUpdateCategory,
    onDeleteCategory
  }: CategorySidebarProps) => {
    const [isAdding, setIsAdding] = useState(false)
    const [newCategoryName, setNewCategoryName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const handleAdd = async (): Promise<void> => {
      if (!newCategoryName.trim()) return
      await onAddCategory(newCategoryName)
      setNewCategoryName('')
      setIsAdding(false)
    }

    const startEdit = (category: Category): void => {
      setEditingId(category.id)
      setEditName(category.name)
    }

    const handleUpdate = async (): Promise<void> => {
      if (editingId && editName.trim()) {
        await onUpdateCategory(editingId, editName)
        setEditingId(null)
      }
    }

    return (
      <div className="flex flex-col h-full w-full max-w-[280px]">
        <div className="p-4 border-b bg-background/50 backdrop-blur">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm tracking-tight text-muted-foreground uppercase">
              Kategoriler
            </h3>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {isAdding && (
            <div className="flex items-center gap-1 animate-in slide-in-from-top-2 duration-200">
              <Input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Yeni Kategori"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') setIsAdding(false)
                }}
              />
              <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleAdd}>
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300"
                onClick={() => setIsAdding(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {categories.map((category) => (
              <div
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent',
                  selectedCategoryId === category.id
                    ? 'bg-primary text-primary-foreground shadow-sm font-medium'
                    : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:border-border/50'
                )}
              >
                {editingId === category.id ? (
                  <div
                    className="flex items-center gap-1 w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm bg-background text-foreground"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdate()
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20"
                      onClick={handleUpdate}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="truncate text-sm">{category.name}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                            selectedCategoryId === category.id
                              ? 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => startEdit(category)}>
                          <Pencil className="w-3 h-3 mr-2" />
                          Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))}

            {categories.length === 0 && !isAdding && (
              <div className="p-4 text-center text-xs text-muted-foreground border-2 border-dashed rounded-lg">
                Henüz kategori yok
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    )
  }
)

CategorySidebar.displayName = 'CategorySidebar'
