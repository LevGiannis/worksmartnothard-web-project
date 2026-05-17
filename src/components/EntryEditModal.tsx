import React from 'react'
import { DailyEntry } from '../services/storage'
import Modal from './Modal'
import { HOME_TYPE_OPTIONS } from '../constants'

interface Props {
  editing: DailyEntry | null
  saving: boolean
  errors: string[]
  category: string
  setCategory: (v: string) => void
  points: number | ''
  setPoints: (v: number | '') => void
  dateOnly: string
  setDateOnly: (v: string) => void
  homeType: string
  setHomeType: (v: string) => void
  orderNumber: string
  setOrderNumber: (v: string) => void
  customerName: string
  setCustomerName: (v: string) => void
  afm: string
  setAfm: (v: string) => void
  mobilePhone: string
  setMobilePhone: (v: string) => void
  landlinePhone: string
  setLandlinePhone: (v: string) => void
  closeEdit: () => void
  submitEdit: () => void
}

export default function EntryEditModal({
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
  closeEdit, submitEdit,
}: Props) {
  return (
    <Modal
      isOpen={!!editing}
      title={editing ? `Επεξεργασία: ${editing.category || 'Entry'}` : 'Επεξεργασία'}
      onClose={closeEdit}
      size="md"
      height="short"
    >
      <div className="grid gap-3">
        {errors.length > 0 && (
          <div className="panel-card" style={{ padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Διόρθωσε τα παρακάτω:</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="form-row">
          <label className="text-sm font-medium">Κατηγορία</label>
          <div className="flex-1">
            <input className="panel-input" value={category} onChange={e => setCategory(e.target.value ? e.target.value.toUpperCase() : '')} />
          </div>
        </div>

        <div className="form-row">
          <label className="text-sm font-medium">Ημερομηνία</label>
          <div className="flex-1">
            <input className="panel-input" type="date" value={dateOnly} onChange={e => setDateOnly(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="text-sm font-medium">Αρ. παραγγελίας</label>
          <div className="flex-1">
            <input className="panel-input" value={orderNumber} onChange={e => setOrderNumber(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="text-sm font-medium">Ονοματεπώνυμο πελάτη</label>
          <div className="flex-1">
            <input className="panel-input" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="text-sm font-medium">Κινητό (προαιρετικό)</label>
          <div className="flex-1">
            <input className="panel-input" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="text-sm font-medium">Σταθερό (προαιρετικό)</label>
          <div className="flex-1">
            <input className="panel-input" value={landlinePhone} onChange={e => setLandlinePhone(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="text-sm font-medium">ΑΦΜ (προαιρετικό)</label>
          <div className="flex-1">
            <input className="panel-input" value={afm} onChange={e => setAfm(e.target.value)} />
          </div>
        </div>

        {String(category || '').toUpperCase() === 'VODAFONE HOME W/F' && (
          <div className="form-row">
            <label className="text-sm font-medium">Υποτύπος</label>
            <div className="flex-1">
              <select className="panel-input" value={homeType} onChange={e => setHomeType(e.target.value)}>
                {HOME_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="form-row">
          <label className="text-sm font-medium">Μονάδες / Σημεία</label>
          <div className="flex-1">
            <input
              className="panel-input"
              type="number"
              step="0.1"
              value={points}
              onChange={e => setPoints(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="form-actions">
          <button className="btn-ghost" onClick={closeEdit} disabled={saving}>Ακύρωση</button>
          <button className="btn" onClick={submitEdit} disabled={saving}>{saving ? 'Αποθήκευση…' : 'Αποθήκευση'}</button>
        </div>
      </div>
    </Modal>
  )
}
