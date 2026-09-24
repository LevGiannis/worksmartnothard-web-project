import { describe, it, expect } from 'vitest'
import { linkPrepayActivations, type PrepayRow } from './prepayActivations'

const d = (day: number, hour = 12) => new Date(2026, 8, day, hour)
const isDone = (e: PrepayRow) => e.status === 'ΟΛΟΚΛΗΡΩΘΗΚΕ'

const row = (over: Partial<PrepayRow> & { subCategory: string; registryNo: string; requestId: string }): PrepayRow => ({
  category: 'prepay',
  status: 'ΟΛΟΚΛΗΡΩΘΗΚΕ',
  implDate: d(23),
  ...over,
})

describe('linkPrepayActivations', () => {
  it('gives each New Prepay as many connections as completed Modify Add On rows of its registry', () => {
    const out = linkPrepayActivations([
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: '1', msisdn: '6947071504' }),
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: '2', msisdn: '6947071535' }),
      row({ subCategory: 'New Prepay', registryNo: 'A', requestId: '3', msisdn: '6947071535' }),
      row({ subCategory: 'Modify Add On', registryNo: 'B', requestId: '4', msisdn: '6947071490' }),
      row({ subCategory: 'New Prepay', registryNo: 'B', requestId: '5' }),
      row({ subCategory: 'New Prepay', registryNo: 'C', requestId: '6' }),
    ], isDone)
    const conn = Object.fromEntries(out.map(e => [e.registryNo, e.connections]))
    expect(conn).toEqual({ A: 2, B: 1, C: 0 })
    expect(out.some(e => e.subCategory === 'Modify Add On')).toBe(false)
  })

  it('ignores add-ons without a New Prepay and add-ons that are not completed', () => {
    const out = linkPrepayActivations([
      row({ subCategory: 'Modify Add On', registryNo: 'X', requestId: '1', msisdn: '1' }),
      row({ subCategory: 'New Prepay', registryNo: 'Y', requestId: '2' }),
      row({ subCategory: 'Modify Add On', registryNo: 'Y', requestId: '3', msisdn: '2', status: 'ΥΠΟ ΥΛΟΠΟΙΗΣΗ' }),
    ], isDone)
    expect(out).toHaveLength(1)
    expect(out[0].connections).toBe(0)
  })

  it('counts a duplicated add-on number once', () => {
    const out = linkPrepayActivations([
      row({ subCategory: 'New Prepay', registryNo: 'A', requestId: '1' }),
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: '2', msisdn: '69' }),
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: '3', msisdn: '69' }),
    ], isDone)
    expect(out[0].connections).toBe(1)
  })

  it('credits an add-on to the latest New Prepay completed before it', () => {
    const out = linkPrepayActivations([
      row({ subCategory: 'New Prepay', registryNo: 'A', requestId: 'old', implDate: d(2) }),
      row({ subCategory: 'New Prepay', registryNo: 'A', requestId: 'new', implDate: d(20) }),
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: 'a1', msisdn: '1', implDate: d(2, 13) }),
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: 'a2', msisdn: '2', implDate: d(20, 13) }),
      row({ subCategory: 'Modify Add On', registryNo: 'A', requestId: 'a3', msisdn: '3', implDate: d(20, 14) }),
    ], isDone)
    const byId = Object.fromEntries(out.map(e => [e.requestId, e.connections]))
    expect(byId).toEqual({ old: 1, new: 2 })
  })

  it('passes other rows through unchanged', () => {
    const other = { ...row({ subCategory: 'Change SIM', registryNo: 'A', requestId: '9' }) }
    const mobile = { ...row({ subCategory: 'X', registryNo: 'A', requestId: '10' }), category: 'mobile' }
    const out = linkPrepayActivations([other, mobile], isDone)
    expect(out).toEqual([other, mobile])
  })
})
