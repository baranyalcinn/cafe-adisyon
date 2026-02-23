import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type Category } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Check, MoreVertical, Pencil, Plus, Trash2, X } from 'lucide-react'
import { memo, useState } from 'react'

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
        <div className="p-4 border-b-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-xs tracking-widest text-zinc-500 dark:text-zinc-400">
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
                className="h-8 w-8 shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
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
                  'group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border-2 border-transparent',
                  selectedCategoryId === category.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md font-bold'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-semibold'
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
                      className="h-7 w-7 text-success hover:text-success active:bg-success/20 hover:bg-success/10"
                      onClick={handleUpdate}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="truncate text-sm font-bold tracking-tight">
                      {category.name}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg',
                            selectedCategoryId === category.id
                              ? 'text-white/70 hover:text-white hover:bg-white/20'
                              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700'
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
