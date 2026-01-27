import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TableCardSkeleton(): React.JSX.Element {
  return (
    <Card className="relative overflow-hidden border-none bg-card/60 backdrop-blur-md shadow-lg h-32 md:h-40">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-12" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 mt-2">
          <Skeleton className="h-8 w-16 mx-auto rounded-full" />
          <div className="flex justify-between items-center mt-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
      {/* Premium shine effect simulation */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 -translate-x-full animate-pulse" />
    </Card>
  )
}
