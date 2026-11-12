import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generarPDF(titulo, cabeceras, filas, nombreArchivo) {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString("es-ES");

  doc.setFontSize(18);
  doc.text(titulo, 14, 20);
  doc.setFontSize(10);
  doc.text(`Fecha: ${fecha}`, 14, 28);

  autoTable(doc, {
    startY: 35,
    head: [cabeceras],
    body: filas,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [30, 201, 164],
    },
    didDrawPage: () => {
      const pagina = doc.internal.getNumberOfPages();
      const altoPagina = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.text(`XestiónApp - Página ${pagina}`, 14, altoPagina - 10);
    },
  });

  doc.save(nombreArchivo);
}
