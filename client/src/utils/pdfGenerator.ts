import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Captures an HTML element and saves it as a high-resolution PDF document
 */
export async function generateBillPDF(elementId: string, filename: string): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found for PDF export`);
    return false;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x retina scale for crisp typography
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = 210; // A4 width in mm
    const margin = 12;
    const printWidth = pdfWidth - margin * 2;
    const printHeight = (canvas.height * printWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', margin, 12, printWidth, printHeight);
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating PDF bill:', error);
    return false;
  }
}
