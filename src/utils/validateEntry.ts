interface EntryValidationFields {
  category: string
  orderNumber: string
  customerName: string
  points: number | ''
  isRantevou?: boolean
  appointmentTotal?: number
}

export function validateEntry(fields: EntryValidationFields): string[] {
  const errs: string[] = []
  const categoryUpper = String(fields.category || '').toUpperCase().trim()

  if (!categoryUpper) errs.push('Επίλεξε ή γράψε κατηγορία')
  if (!String(fields.orderNumber || '').trim()) errs.push('Πρόσθεσε αριθμό παραγγελίας')
  if (!String(fields.customerName || '').trim()) errs.push('Πρόσθεσε ονοματεπώνυμο πελάτη')

  if (fields.isRantevou) {
    if (!fields.appointmentTotal || fields.appointmentTotal <= 0) {
      errs.push('Πρόσθεσε τουλάχιστον ένα ποσό για ραντεβού')
    }
  } else {
    const pts = typeof fields.points === 'number' ? fields.points : parseFloat(String(fields.points || '0'))
    if (!pts || pts <= 0) errs.push('Πρόσθεσε έγκυρα σημεία (>0)')
  }

  return errs
}
