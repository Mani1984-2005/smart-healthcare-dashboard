
import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import path from 'path';
import { Blob } from 'node:buffer';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let workerPromise = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(env.ocrLang).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }

  return workerPromise;
}

async function runTesseractOcr(imagePath) {
  const start = Date.now();
  const worker = await getWorker();

  try {
    const { data } = await worker.recognize(imagePath);
    const durationMs = Date.now() - start;

    logger.info('Tesseract OCR completed', {
      durationMs,
      confidence: data.confidence,
    });

    return {
      text: (data.text || '').trim(),
      confidence: data.confidence ?? null,
      durationMs,
      engine: 'tesseract.js',
    };
  } catch (err) {
    logger.error('Tesseract OCR failed', {
      error: err.message,
    });

    throw err;
  }
}

// Runner used for direct `tesseract` engine mode and for the optional
// PaddleOCR fallback (see the test seam below).
let tesseractRunner = runTesseractOcr;

async function runPaddleOcr(imagePath) {
  const start = Date.now();

  if (!env.paddleOcrToken) {
    throw new Error('PaddleOCR API token is not configured');
  }

  const imageBuffer = await fs.readFile(imagePath);
  const formData = new FormData();

  // The PaddleOCR service validates the declared content type against the
  // actual image format, so derive it from the real file extension.
  const mimeByExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const blobType =
    mimeByExt[path.extname(imagePath).toLowerCase()] || 'image/png';

  formData.append(
    'file',
    new Blob([imageBuffer], { type: blobType }),
    path.basename(imagePath)
  );

  const response = await fetch(`${env.paddleOcrUrl}/ocr`, {
    method: 'POST',
    headers: {
      'X-API-Key': env.paddleOcrToken,
    },
    body: formData,
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    throw new Error(`PaddleOCR request failed with HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result.success !== true || typeof result.text !== 'string') {
    throw new Error('PaddleOCR returned an invalid response');
  }

  const durationMs = Date.now() - start;

  logger.info('PaddleOCR completed', {
    durationMs,
    confidence: result.confidence ?? null,
    lineCount: result.line_count ?? null,
  });

  return {
    text: result.text.trim(),
    confidence: result.confidence ?? null,
    durationMs,
    engine: 'PaddleOCR',
  };
}

export async function runImageOcr(imagePath) {
  if (env.ocrEngine === 'tesseract') {
    return tesseractRunner(imagePath);
  }

  if (env.ocrEngine !== 'paddleocr') {
    throw new Error(`Unsupported OCR engine: ${env.ocrEngine}`);
  }

  try {
    return await runPaddleOcr(imagePath);
  } catch (err) {
    logger.error('PaddleOCR failed', {
      error: err.message,
      fallbackEnabled: env.ocrFallbackToTesseract,
    });

    if (!env.ocrFallbackToTesseract) {
      throw err;
    }

    logger.warn('Using Tesseract fallback');

    return tesseractRunner(imagePath);
  }
}

// ---------------------------------------------------------------------
// Test seam: lets automated tests substitute the Tesseract runner so the
// fallback decision logic can be verified without downloading language
// data. Production behavior is unchanged (the real runner is the default).
// ---------------------------------------------------------------------
export function __setTesseractRunnerForTests(runner) {
  tesseractRunner = runner || runTesseractOcr;
}

export async function runPdfExtraction(pdfPath) {
  const start = Date.now();
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = await fs.readFile(pdfPath);

  try {
    const result = await pdfParse(buffer);
    const durationMs = Date.now() - start;
    const text = (result.text || '').trim();

    logger.info('PDF text extraction completed', {
      durationMs,
      chars: text.length,
    });

    return {
      text,
      confidence: text.length > 0 ? 95 : 0,
      durationMs,
      engine: 'pdf-parse',
    };
  } catch (err) {
    logger.error('PDF extraction failed', {
      error: err.message,
    });

    throw err;
  }
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
