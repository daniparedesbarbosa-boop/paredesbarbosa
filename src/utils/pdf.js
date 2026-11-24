import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generarPDF(titulo, cabeceras, filas, nombreArchivo) {
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString("gl-ES");

  doc.setFontSize(18);
  doc.text(titulo, 14, 20);
  doc.setFontSize(10);
  doc.text(`Data: ${fecha}`, 14, 28);

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
      doc.text(`Sanidade Teis - Páxina ${pagina}`, 14, altoPagina - 10);
    },
  });

  doc.save(nombreArchivo);
}

export function generarTicketPDF(cita, nombreArchivo) {
  const doc = new jsPDF({ unit: "mm", format: [80, 220] });
  const ancho = doc.internal.pageSize.getWidth();
  const verde = [0, 72, 0];
  const verdeClaro = [22, 163, 74];
  const gris = [91, 105, 100];
  let y = 12;

  doc.setFillColor(...verde);
  doc.rect(0, 0, ancho, 3, "F");
  doc.setTextColor(...verde);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("SANIDADE TEIS", ancho / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(...gris);
  doc.setFont("helvetica", "normal");
  doc.text("CENTRO DE SAÚDE · XESTIÓN DE CITAS", ancho / 2, y, {
    align: "center",
  });
  y += 8;

  doc.setDrawColor(...verdeClaro);
  doc.setLineWidth(0.5);
  doc.line(7, y, ancho - 7, y);
  y += 7;
  doc.setTextColor(...verde);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("XUSTIFICANTE DE CITA", ancho / 2, y, { align: "center" });
  y += 7;

  const fechaEmision = new Date().toLocaleString("gl-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...gris);
  doc.text(`Emitido o: ${fechaEmision}`, ancho / 2, y, { align: "center" });
  y += 8;
  doc.setDrawColor(210, 220, 214);
  doc.line(7, y, ancho - 7, y);
  y += 6;

  const campo = (etiqueta, valor, espacio = 4) => {
    doc.setTextColor(...verde);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(etiqueta.toUpperCase(), 7, y);
    y += 4;
    doc.setTextColor(35, 50, 56);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const lineas = doc.splitTextToSize(String(valor || "—"), ancho - 14);
    doc.text(lineas, 7, y);
    y += lineas.length * 4 + espacio;
  };

  campo("Nº cita", cita.id);
  campo("Estado", cita.estado);
  campo("Data", cita.fecha);
  campo("Hora", cita.hora);
  campo("Paciente", cita.paciente);
  campo(
    "Profesional",
    `${cita.doctor || "—"}${cita.especialidad ? ` · ${cita.especialidad}` : ""}`,
  );

  doc.setDrawColor(210, 220, 214);
  doc.line(7, y, ancho - 7, y);
  y += 6;
  campo("Motivo da consulta", cita.motivo);
  campo("Diagnóstico", cita.diagnostico);
  campo("Tratamento", cita.tratamento);
  campo("Observacións", cita.observacions, 6);

  doc.setDrawColor(...verdeClaro);
  doc.line(7, y, ancho - 7, y);
  y += 7;
  doc.setTextColor(...verde);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TARIFA", 7, y);
  doc.text(`${Number(cita.tarifa || 0).toFixed(2)} EUR`, ancho - 7, y, {
    align: "right",
  });
  y += 9;
  doc.setTextColor(...gris);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Grazas por confiar en Sanidade Teis", ancho / 2, y, {
    align: "center",
  });

  doc.save(nombreArchivo);
}
