import { createWorker } from 'tesseract.js';
import fs from 'fs/promises';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let workerPromise = null;

/**
 * Lazily initializes a single shared Tesseract worker and reuses it
 * across requests to avoid the ~1-2s cold-start cost on every OCR call.
 */
async function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(env.ocrLang).catch((err) => {
      workerPromise = null; // allow retry on next call
      throw err;
    });
  }
  return workerPromise;
}

/**
 * Runs OCR on a preprocessed image and returns raw text + confidence.
 */
export async function runImageOcr(imagePath) {
  const start = Date.now();
  const worker = await getWorker();

  try {
    const { data } = await worker.recognize(imagePath);
    const durationMs = Date.now() - start;

    logger.info('OCR completed', { imagePath, durationMs, confidence: data.confidence });

    return {
      text: (data.text || '').trim(),
      confidence: data.confidence ?? null,
      durationMs,
    };
  } catch (err) {
    logger.error('OCR failed', { imagePath, error: err.message });
    throw err;
  }
}

/**
 * Extracts embedded text from a PDF prescription. Falls back gracefully
 * if the PDF is a pure scan with no embedded text layer (returns empty text
 * with a low confidence marker so the caller can flag it for manual review).
 */
export async function runPdfExtraction(pdfPath) {
  const start = Date.now();
  const pdfParse = (await import('pdf-parse')).default;
  const buffer = await fs.readFile(pdfPath);

  try {
    const result = await pdfParse(buffer);
    const durationMs = Date.now() - start;
    const text = (result.text || '').trim();

    logger.info('PDF text extraction completed', { pdfPath, durationMs, chars: text.length });

    return {
      text,
      confidence: text.length > 0 ? 95 : 0,
      durationMs,
    };
  } catch (err) {
    logger.error('PDF extraction failed', { pdfPath, error: err.message });
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
