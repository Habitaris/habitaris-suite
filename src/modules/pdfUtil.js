import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function downloadPDF(htmlContent, fileName, format = "a4") {
  // Create hidden container
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;background:#fff";
  
  // Set width based on format
  const isA4 = format === "a4";
  const w = isA4 ? 794 : 529; // 210mm or 140mm at 96dpi
  container.style.width = w + "px";
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Wait for images to load
  const imgs = container.querySelectorAll("img");
  await Promise.all([...imgs].map(img => 
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
  ));

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: w,
      windowWidth: w,
      backgroundColor: "#ffffff"
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const imgW = canvas.width;
    const imgH = canvas.height;

    // PDF dimensions in mm
    const pdfW = isA4 ? 210 : 140;
    const pdfH = (imgH * pdfW) / imgW;
    const pageH = isA4 ? 297 : 216;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: isA4 ? "a4" : [140, 216]
    });

    // If content fits in one page
    if (pdfH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
    } else {
      // Multi-page
      let position = 0;
      let remaining = pdfH;
      let page = 0;
      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -position, pdfW, pdfH);
        position += pageH;
        remaining -= pageH;
        page++;
      }
    }

    pdf.save(fileName + ".pdf");
  } finally {
    document.body.removeChild(container);
  }
}
