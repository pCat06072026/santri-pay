import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable, { UserOptions } from "jspdf-autotable";
import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Utility to export an array of objects to an Excel file.
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName = "Sheet1"
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Auto-width columns based on content
  const maxWidths = new Map<number, number>();
  
  // Calculate max length for each column including headers
  const headers = Object.keys(data[0] || {});
  headers.forEach((header, idx) => {
    maxWidths.set(idx, header.length);
  });
  
  data.forEach(row => {
    headers.forEach((header, idx) => {
      const val = row[header];
      const length = val !== null && val !== undefined ? String(val).length : 0;
      if (length > (maxWidths.get(idx) || 0)) {
        maxWidths.set(idx, length);
      }
    });
  });
  
  worksheet["!cols"] = Array.from(maxWidths.values()).map(w => ({ wch: Math.min(w + 2, 50) }));

  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

type PDFExportOptions = {
  filename: string;
  title: string;
  subtitle?: string;
  head: string[][];
  body: (string | number)[][];
  orientation?: "portrait" | "landscape";
};

/**
 * Utility to export table data to a PDF file.
 */
export function exportToPDF({
  filename,
  title,
  subtitle,
  head,
  body,
  orientation = "portrait",
}: PDFExportOptions) {
  const doc = new jsPDF(orientation, "pt", "a4");
  
  // Header section
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 40, 40);
  
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 40, 60);
  }
  
  const dateStr = `Dicetak pada: ${format(new Date(), "dd MMMM yyyy HH:mm", { locale: id })}`;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(dateStr, 40, subtitle ? 80 : 60);

  // Table using jspdf-autotable
  autoTable(doc, {
    startY: subtitle ? 95 : 75,
    head,
    body,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [0, 143, 179], // #008FB3 (Brand Primary)
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  doc.save(`${filename}.pdf`);
}
