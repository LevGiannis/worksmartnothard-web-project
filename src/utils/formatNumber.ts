export function roundNumber(value: number, fractionDigits = 2): number {
  const factor = 10 ** fractionDigits
  // Add EPSILON to reduce cases like 1.005 -> 1.00 due to binary float rounding
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function formatNumber(value: number, maximumFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '0'
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
  }).format(value)
}
