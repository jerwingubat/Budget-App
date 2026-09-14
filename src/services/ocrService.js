const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;

let workerPromise = null;
let progressHandler = null;

export function setOcrProgressHandler(fn) {
  progressHandler = fn;
}

const STATUS_LABELS = {
  'loading tesseract core': 'Loading OCR engine…',
  'initializing tesseract core': 'Preparing OCR engine…',
  'loading language traineddata': 'Downloading language data (first run)…',
  'initializing api': 'Preparing OCR engine…',
  'recognizing text': 'Reading receipt…',
};

async function loadTesseract() {
  const mod = await import('tesseract.js');
  return mod.createWorker;
}

async function getWorker() {
  if (!workerPromise) {
    const createWorker = await loadTesseract();
    workerPromise = createWorker('eng', 1, {
      logger: (m) => {
        if (!progressHandler) return;
        progressHandler({
          progress: m.progress || 0,
          label: STATUS_LABELS[m.status] || m.status || '',
        });
      },
    });
  }
  return workerPromise;
}

export async function preloadOcr({ onProgress } = {}) {
  if (onProgress) setOcrProgressHandler(onProgress);
  await getWorker();
}

export async function disposeOcr() {
  if (workerPromise) {
    try { (await workerPromise).terminate(); } catch {}
    workerPromise = null;
  }
  setOcrProgressHandler(null);
}

function decodeImageToCanvas(imgSource) {
  return new Promise((resolve, reject) => {
    const url = typeof imgSource === 'string' ? imgSource : URL.createObjectURL(imgSource);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      if (typeof imgSource === 'string') { URL.revokeObjectURL(url); }
      else { URL.revokeObjectURL(url); }
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image. Try a JPEG or PNG.'));
    };
    img.src = url;
  });
}

export async function prepareImage(file) {
  if (!file) throw new Error('No image selected');
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
  if (!allowed.some(t => (file.type || '').startsWith(t)) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || '')) {
    throw new Error('Unsupported image type. Please use JPEG, PNG or WebP.');
  }
  const canvas = await decodeImageToCanvas(file);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Image processing failed'))), 'image/jpeg', JPEG_QUALITY);
  });
  return blob;
}

export async function extractTextFromImage(image, { onProgress } = {}) {
  if (!image) throw new Error('No image selected');
  if (onProgress) setOcrProgressHandler(onProgress);
  const worker = await getWorker();
  const { data } = await worker.recognize(image, {}, { text: true });
  return { text: data.text, confidence: data.confidence };
}

export const OCR_STATUS_LABELS = STATUS_LABELS;