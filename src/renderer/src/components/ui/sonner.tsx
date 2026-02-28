import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps): React.JSX.Element => {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" />,
        info: <InfoIcon className="size-4 text-blue-500" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" />,
        error: <OctagonXIcon className="size-4 text-rose-500" />,
        loading: <Loader2Icon className="size-4 animate-spin text-primary" />
      }}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-zinc-950 group-[.toaster]:text-white group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.5)] group-[.toaster]:rounded-2xl',
          description:
            'group-[.toast]:text-white/70 group-[.error]:text-white/80 group-[.success]:text-white/80 group-[.info]:text-teal-100/70',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400',
          info: 'group-[.toaster]:bg-teal-950 group-[.toaster]:border-teal-500/30 group-[.toaster]:text-teal-100',
          error:
            'group-[.toaster]:bg-rose-700 group-[.toaster]:border-rose-800 group-[.toaster]:text-white',
          success:
            'group-[.toaster]:bg-emerald-600 group-[.toaster]:border-emerald-700 group-[.toaster]:text-white'
        }
      }}
      {...props}
    />
  )
}

export { Toaster }
