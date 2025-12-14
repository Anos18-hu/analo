import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const downloadPDF = async (
  elementId: string, 
  fileName: string, 
  orientation: 'portrait' | 'landscape' = 'portrait'
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // Capture the element as a canvas
    // We set windowWidth to 1200px to ensure the layout captured is consistent 
    // and resembles a standard desktop view, which scales nicely to A4.
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true, 
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1200, 
      // Ensure we capture full height
      height: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Initialize PDF with A4
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10; // 10mm margin
    
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = pageHeight - (margin * 2);

    // Calculate image height maintaining aspect ratio relative to content width
    const imgHeight = (canvas.height * contentWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = margin;

    // Add the first page
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
    heightLeft -= contentHeight;

    // Add extra pages if the content overflows
    while (heightLeft > 0) {
      position -= contentHeight; // Shift up
      pdf.addPage();
      // Draw the image shifted up so the next chunk is visible
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      
      heightLeft -= contentHeight;
    }

    pdf.save(fileName);
    return true;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
    return false;
  }
};