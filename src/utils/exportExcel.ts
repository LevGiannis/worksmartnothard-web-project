// Utility for exporting eco-friendly Excel (XLSX) files


// Dynamic import for Vite/browser compatibility
// Returns a Promise
export async function exportEcoFriendlyExcel({
  data,
  filename = 'report.xlsx',
  sheetName = 'Αναφορά',
  headers = [],
  greenHeader = true
}: {
  data: any[],
  filename?: string,
  sheetName?: string,
  headers?: string[],
  greenHeader?: boolean
}) {
  const XLSX = await import('xlsx')
  // Prepare worksheet data
  const wsData = [headers.length ? headers : Object.keys(data[0]||{})]
  for(const row of data) {
    wsData.push(headers.length ? headers.map(h => row[h]) : Object.values(row))
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Eco-friendly: green header row
  if(greenHeader && ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref'])
    for(let C = range.s.c; C <= range.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({r:0, c:C})]
      if(cell) {
        cell.s = {
          fill: { fgColor: { rgb: 'C6EFCE' } }, // light green
          font: { bold: true, color: { rgb: '006100' } }, // dark green text
          alignment: { horizontal: 'center' }
        }
      }
    }
    ws['!rows'] = [{ hpt: 22 }]
  }

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)

  // Write and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: true })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
