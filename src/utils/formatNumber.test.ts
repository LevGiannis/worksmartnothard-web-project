import { describe, it, expect } from 'vitest'
import { roundNumber, formatNumber } from './formatNumber'

describe('roundNumber', () => {
  it('rounds to 2 decimal places by default', () => {
    expect(roundNumber(1.005)).toBe(1.01)
  })

  it('handles the EPSILON edge case (1.005 does not round down)', () => {
    expect(roundNumber(1.005, 2)).toBeGreaterThanOrEqual(1.01)
  })

  it('rounds to specified decimal places', () => {
    expect(roundNumber(1.2345, 3)).toBe(1.235)
  })

  it('rounds 0 to 0', () => {
    expect(roundNumber(0)).toBe(0)
  })

  it('rounds integers unchanged', () => {
    expect(roundNumber(42, 2)).toBe(42)
  })

  it('rounds to 0 decimals', () => {
    expect(roundNumber(1.6, 0)).toBe(2)
    expect(roundNumber(1.4, 0)).toBe(1)
  })
})

describe('formatNumber', () => {
  it('formats integer with 0 decimals', () => {
    expect(formatNumber(5, 0)).toBe('5')
  })

  it('formats float up to max fraction digits', () => {
    expect(formatNumber(1.5, 2)).toMatch(/1[.,]5/)
  })

  it('does not exceed maximumFractionDigits', () => {
    const result = formatNumber(1.23456, 2)
    const decimals = result.split(/[.,]/)[1] ?? ''
    expect(decimals.length).toBeLessThanOrEqual(2)
  })

  it('returns "0" for NaN', () => {
    expect(formatNumber(NaN)).toBe('0')
  })

  it('returns "0" for Infinity', () => {
    expect(formatNumber(Infinity)).toBe('0')
  })

  it('returns "0" for -Infinity', () => {
    expect(formatNumber(-Infinity)).toBe('0')
  })

  it('formats zero as "0"', () => {
    expect(formatNumber(0, 2)).toBe('0')
  })
})
