import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for browser
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
}

/**
 * Extracts plain text from an uploaded PDF File
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items) {
        if ('str' in item) {
          // If Y position changed significantly, add newline
          if (lastY !== null && 'transform' in item && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          if ('transform' in item) {
            lastY = item.transform[5];
          }
        }
      }

      fullText += `\n--- Page ${pageNum} ---\n` + pageText.trim() + '\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error parsing PDF with pdfjs-dist:', error);
    throw new Error(
      error instanceof Error 
        ? `Could not read PDF: ${error.message}. Please ensure the PDF is not password protected.`
        : 'Failed to extract text from PDF.'
    );
  }
}
