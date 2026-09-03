import * as XLSX from 'xlsx'

/**
 * Exporta datos a un archivo Excel (.xlsx)
 * @param {Array<Object>} data - Arreglo de objetos con los datos de las filas
 * @param {string} fileName - Nombre del archivo de salida
 */
export function exportToExcel(data, fileName = 'reporte_quincenal.xlsx') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen Quincenal')
    XLSX.writeFile(workbook, fileName)
    console.log('[Export] Excel generado con éxito:', fileName)
  } catch (error) {
    console.error('[Export] Error al generar archivo Excel:', error)
  }
}

/**
 * Genera y descarga un reporte en formato PDF desde un elemento HTML
 * @param {string} elementId - ID del elemento contenedor a imprimir
 * @param {string} title - Título del documento PDF
 */
export async function exportToPDF(elementId, title = 'Reporte Quincenal') {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      console.warn('[Export] Elemento no encontrado para exportar PDF:', elementId)
      window.print()
      return
    }

    const html2canvas = (await import('html2canvas')).default
    const { jsPDF } = await import('jspdf')

    const canvas = await html2canvas(element, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const pageHeight = 295
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`)
  } catch (err) {
    console.warn('[Export] Fallback a impresión nativa del navegador:', err)
    window.print()
  }
}
