import { describe, it, expect } from 'vitest'
import { validateEntry } from './validateEntry'

const valid = {
  category: 'PORTIN MOBILE',
  orderNumber: 'ORD-001',
  customerName: 'Γιάννης Παπαδόπουλος',
  points: 1,
}

describe('validateEntry', () => {
  it('returns no errors for a valid entry', () => {
    expect(validateEntry(valid)).toEqual([])
  })

  it('errors when category is empty', () => {
    const errs = validateEntry({ ...valid, category: '' })
    expect(errs).toContain('Επίλεξε ή γράψε κατηγορία')
  })

  it('errors when category is only whitespace', () => {
    const errs = validateEntry({ ...valid, category: '   ' })
    expect(errs).toContain('Επίλεξε ή γράψε κατηγορία')
  })

  it('errors when orderNumber is empty', () => {
    const errs = validateEntry({ ...valid, orderNumber: '' })
    expect(errs).toContain('Πρόσθεσε αριθμό παραγγελίας')
  })

  it('errors when customerName is empty', () => {
    const errs = validateEntry({ ...valid, customerName: '' })
    expect(errs).toContain('Πρόσθεσε ονοματεπώνυμο πελάτη')
  })

  it('errors when points is 0', () => {
    const errs = validateEntry({ ...valid, points: 0 })
    expect(errs).toContain('Πρόσθεσε έγκυρα σημεία (>0)')
  })

  it('errors when points is empty string', () => {
    const errs = validateEntry({ ...valid, points: '' })
    expect(errs).toContain('Πρόσθεσε έγκυρα σημεία (>0)')
  })

  it('errors when points is negative', () => {
    const errs = validateEntry({ ...valid, points: -1 })
    expect(errs).toContain('Πρόσθεσε έγκυρα σημεία (>0)')
  })

  it('accepts float points', () => {
    expect(validateEntry({ ...valid, points: 0.5 })).toEqual([])
  })

  it('can return multiple errors at once', () => {
    const errs = validateEntry({ category: '', orderNumber: '', customerName: '', points: 0 })
    expect(errs.length).toBe(4)
  })

  describe('ΡΑΝΤΕΒΟΥ', () => {
    const rantevouBase = { ...valid, isRantevou: true }

    it('errors when appointmentTotal is missing', () => {
      const errs = validateEntry({ ...rantevouBase, appointmentTotal: undefined })
      expect(errs).toContain('Πρόσθεσε τουλάχιστον ένα ποσό για ραντεβού')
    })

    it('errors when appointmentTotal is 0', () => {
      const errs = validateEntry({ ...rantevouBase, appointmentTotal: 0 })
      expect(errs).toContain('Πρόσθεσε τουλάχιστον ένα ποσό για ραντεβού')
    })

    it('does not error when appointmentTotal is positive', () => {
      const errs = validateEntry({ ...rantevouBase, points: 0, appointmentTotal: 6.85 })
      expect(errs).not.toContain('Πρόσθεσε τουλάχιστον ένα ποσό για ραντεβού')
      expect(errs).not.toContain('Πρόσθεσε έγκυρα σημεία (>0)')
    })
  })
})
