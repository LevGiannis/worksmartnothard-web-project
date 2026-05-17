/// <reference types="vite/client" />

interface WsDeviceStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
}

interface Window {
  wsDeviceStorage?: WsDeviceStorage
}
