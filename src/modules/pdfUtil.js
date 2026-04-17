// PDF utility - loads html2canvas + jsPDF from CDN, renders in hidden visible container
let _h2c = null;
let _jsPDF = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureLibs() {
  if (!_h2c) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    _h2c = window.html2canvas;
  }
  if (!_jsPDF) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    _jsPDF = window.jspdf.jsPDF;
  }
}

export async function downloadPDF(htmlContent, fileName, format = "a4") {
  await ensureLibs();

  const isA4 = format === "a4";
  const w = isA4 ? 794 : 529;

  // Create visible container (behind everything, will be removed after)
  const container = document.createElement("div");
  container.style.cssText = `position:fixed;left:0;top:0;width:${w}px;background:#fff;z-index:99999;padding:40px 50px;font-family:Helvetica,Arial,sans-serif;font-size:10pt;color:#111;line-height:1.45;overflow:hidden`;
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  // Wait for images to load
  const imgs = container.querySelectorAll("img");
  await Promise.all([...imgs].map(img =>
    img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })
  ));

  // Small delay for rendering
  await new Promise(r => setTimeout(r, 200));

  try {
    const canvas = await _h2c(container, {
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
    const pdfW = isA4 ? 210 : 140;
    const pdfH = (imgH * pdfW) / imgW;
    const pageH = isA4 ? 297 : 216;

    const pdf = new _jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: isA4 ? "a4" : [140, 216]
    });

    if (pdfH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfW, pdfH);
    } else {
      let position = 0;
      let page = 0;
      while (position < pdfH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -position, pdfW, pdfH);
        position += pageH;
        page++;
      }
    }

    pdf.save(fileName + ".pdf");
  } finally {
    document.body.removeChild(container);
  }
}
