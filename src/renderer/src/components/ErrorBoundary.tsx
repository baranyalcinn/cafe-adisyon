import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full p-6 rounded-lg border bg-card shadow-lg text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-xl font-bold">Bir Hata Oluştu</h1>

            <p className="text-muted-foreground text-sm">
              Uygulama beklenmedik bir hatayla karşılaştı. Lütfen sayfayı yenileyin.
            </p>

            <div className="bg-muted p-3 rounded text-xs font-mono text-left overflow-auto max-h-32">
              {this.state.error?.message}
            </div>

            <Button className="w-full gap-2" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" />
              Uygulamayı Yenile
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
