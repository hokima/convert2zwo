import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  getZwiftPath: () => ipcRenderer.invoke('zwift:getWorkoutsPath'),
  saveWorkout: (args: { filename: string; content: string; zwiftPath: string | null }) =>
    ipcRenderer.invoke('zwift:saveWorkout', args),
  openImage: () => ipcRenderer.invoke('dialog:openImage'),
  fetchAI: (args: { url: string; headers: Record<string, string>; body: string }) =>
    ipcRenderer.invoke('ai:fetch', args),
  saveKey: (key: string, value: string) => ipcRenderer.invoke('keys:save', { key, value }),
  loadKey: (key: string): Promise<string> => ipcRenderer.invoke('keys:load', key)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
