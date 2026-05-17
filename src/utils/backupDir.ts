// queryPermission/requestPermission not yet in TS lib.dom — extend here
declare global {
  interface FileSystemHandle {
    queryPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
    requestPermission(desc: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  }
}

const DB_NAME = 'ws-backup-dir'
const STORE_NAME = 'handles'
const HANDLE_KEY = 'backup-dir'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getStoredDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(HANDLE_KEY)
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function setStoredDirHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(handle, HANDLE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function clearStoredDirHandle(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(HANDLE_KEY)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// Opens a folder picker and stores the chosen handle. Requires user gesture.
export async function pickBackupDir(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) return null
  try {
    const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' })
    await setStoredDirHandle(handle)
    return handle
  } catch (e: any) {
    if (e?.name === 'AbortError') return null
    throw e
  }
}

// Returns a handle with verified readwrite permission, or null.
// Pass requireUserGesture=true when called from a button click to prompt if needed.
export async function getActiveDirHandle(requireUserGesture = false): Promise<FileSystemDirectoryHandle | null> {
  const handle = await getStoredDirHandle()
  if (!handle) return null
  const perm = await handle.queryPermission({ mode: 'readwrite' })
  if (perm === 'granted') return handle
  if (requireUserGesture) {
    const granted = await handle.requestPermission({ mode: 'readwrite' })
    return granted === 'granted' ? handle : null
  }
  return null
}

export async function writeFileToDir(handle: FileSystemDirectoryHandle, filename: string, content: string): Promise<void> {
  const fileHandle = await handle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export function isDirPickerSupported(): boolean {
  return 'showDirectoryPicker' in window
}
