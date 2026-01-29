import { ApiType } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    api: ApiType
  }
}
