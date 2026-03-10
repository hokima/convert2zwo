import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getZwiftPath: () => Promise<string | null>
      saveWorkout: (args: {
        filename: string
        content: string
        zwiftPath: string | null
      }) => Promise<{ success: boolean; path?: string; message?: string }>
      openImage: () => Promise<{
        path: string
        base64: string
        mediaType: 'image/jpeg' | 'image/png'
      } | null>
      fetchAI: (args: {
        url: string
        headers: Record<string, string>
        body: string
      }) => Promise<{ ok: boolean; status: number; text: string }>
      saveKey: (key: string, value: string) => Promise<void>
      loadKey: (key: string) => Promise<string>
    }
  }
}
