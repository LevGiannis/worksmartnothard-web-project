import { useState } from 'react'
import { DailyEntry, updateEntry } from '../services/storage'
import { validateEntry } from '../utils/validateEntry'

interface UseEntryFormOptions {
  onSuccess?: () => void | Promise<void>
}

export function useEntryForm({ onSuccess }: UseEntryFormOptions = {}) {
  const [editing, setEditing] = useState<DailyEntry | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [category, setCategory] = useState('')
  const [points, setPoints] = useState<number | ''>('')
  const [dateOnly, setDateOnly] = useState('')
  const [homeType, setHomeType] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [afm, setAfm] = useState('')
  const [mobilePhone, setMobilePhone] = useState('')
  const [landlinePhone, setLandlinePhone] = useState('')

  const openEdit = (entry: DailyEntry) => {
    setEditing(entry)
    setErrors([])
    setCategory(String(entry.category || '').toUpperCase())
    setPoints(typeof entry.points === 'number' ? entry.points : '')
    try {
      const d = entry.date ? new Date(entry.date) : new Date()
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      setDateOnly(`${yyyy}-${mm}-${dd}`)
    } catch {
      setDateOnly('')
    }
    setHomeType(String(entry.homeType || ''))
    setOrderNumber(String(entry.orderNumber || ''))
    setCustomerName(String(entry.customerName || ''))
    setAfm(String(entry.afm || ''))
    setMobilePhone(String(entry.mobilePhone || ''))
    setLandlinePhone(String(entry.landlinePhone || ''))
  }

  const closeEdit = () => {
    if (saving) return
    setEditing(null)
    setErrors([])
  }

  const submitEdit = async () => {
    if (!editing) return
    const errs = validateEntry({ category, orderNumber, customerName, points })
    setErrors(errs)
    if (errs.length > 0) return

    setSaving(true)
    try {
      const categoryUpper = String(category || '').toUpperCase().trim()
      const pts = typeof points === 'number' ? points : parseFloat(String(points || '0'))
      const isoDate = dateOnly
        ? new Date(`${dateOnly}T12:00:00`).toISOString()
        : (editing.date || new Date().toISOString())

      await updateEntry(editing.id, {
        category: categoryUpper,
        points: Number(pts),
        date: isoDate,
        homeType: categoryUpper === 'VODAFONE HOME W/F' ? homeType : '',
        orderNumber: orderNumber.trim(),
        customerName: customerName.trim(),
        afm: afm.trim(),
        mobilePhone: mobilePhone.trim(),
        landlinePhone: landlinePhone.trim(),
      })

      await onSuccess?.()
      setEditing(null)
    } catch (e) {
      console.error(e)
      setErrors(['Σφάλμα ενημέρωσης καταχώρησης'])
    } finally {
      setSaving(false)
    }
  }

  return {
    editing, saving, errors,
    category, setCategory,
    points, setPoints,
    dateOnly, setDateOnly,
    homeType, setHomeType,
    orderNumber, setOrderNumber,
    customerName, setCustomerName,
    afm, setAfm,
    mobilePhone, setMobilePhone,
    landlinePhone, setLandlinePhone,
    openEdit, closeEdit, submitEdit,
  }
}
